
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { WelcomeScreen } from './components/WelcomeScreen';
import { VoiceInterface } from './components/VoiceInterface';
import { startAuraSession, createPcmBlob, generateSpeech } from './services/geminiService';
import { LiveServerMessage } from '@google/genai';
import { decode, decodeAudioData } from './utils/audio';
import { useWakeWordListener } from './hooks/useWakeWordListener';
import { useSynchronizedTypewriter } from './hooks/useSynchronizedTypewriter';
import { AuraLogo } from './components/AuraLogo';

// Constants for audio processing
const INPUT_SAMPLE_RATE = 16000;
const OUTPUT_SAMPLE_RATE = 24000;
const BUFFER_SIZE = 4096;
const MALE_VOICES = ['Puck', 'Charon'];
const FEMALE_VOICES = ['Kore', 'Zephyr'];

/**
 * A simple peak-picking algorithm to find the dominant frequency in an audio buffer.
 * Note: This is a basic heuristic and may pick harmonics instead of the fundamental
 * frequency, but serves as a pragmatic solution without complex DSP libraries.
 */
const findDominantFreq = (dataArray: Uint8Array, sampleRate: number, fftSize: number): number => {
    let maxVal = -Infinity;
    let maxIndex = 0;
    for (let i = 0; i < dataArray.length; i++) {
        if (dataArray[i] > maxVal) {
            maxVal = dataArray[i];
            maxIndex = i;
        }
    }
    return maxIndex * (sampleRate / fftSize);
};

// This function analyzes the user's voice pitch from a provided audio stream.
const determineVoice = (preference: VoicePreference, stream: MediaStream): Promise<string> => {
  return new Promise(async (resolve) => {
    if (preference === 'male') {
      resolve(MALE_VOICES[0]);
      return;
    }
    if (preference === 'female') {
      resolve(FEMALE_VOICES[1]);
      return;
    }

    // Auto-detection logic
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: INPUT_SAMPLE_RATE });
    
    if (audioContext.state === 'suspended') {
        await audioContext.resume();
    }

    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 1024;
    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    const samples: number[] = [];
    const intervalId = setInterval(() => {
      analyser.getByteFrequencyData(dataArray);
      const freq = findDominantFreq(dataArray, INPUT_SAMPLE_RATE, analyser.fftSize);
      
      if (freq > 70 && freq < 300) samples.push(freq);

      if (samples.length >= 10) {
        clearInterval(intervalId);
        source.disconnect();
        audioContext.close();
        const avgFreq = samples.reduce((a, b) => a + b, 0) / samples.length;
        console.log('Average detected frequency:', avgFreq);
        const isLowPitch = avgFreq < 170; 
        const voice = isLowPitch ? FEMALE_VOICES[1] : MALE_VOICES[0];
        console.log(`Pitch detected as ${isLowPitch ? 'low' : 'high'}. Selecting voice: ${voice}`);
        resolve(voice);
      }
    }, 100);

    setTimeout(() => {
      if (samples.length < 10) {
        clearInterval(intervalId);
        source.disconnect();
        audioContext.close();
        console.warn('Pitch detection timed out, using default voice.');
        resolve(FEMALE_VOICES[1]); // Default to Zephyr
      }
    }, 2500);
  });
};

type VoicePreference = 'auto' | 'female' | 'male';
type SessionState = 'idle' | 'greeting' | 'analyzing' | 'active' | 'error';

const App: React.FC = () => {
  const [isKeySelected, setIsKeySelected] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);
  const [assistantName, setAssistantName] = useState<string | null>(null);
  const [voicePreference, setVoicePreference] = useState<VoicePreference>('auto');
  const [sessionState, setSessionState] = useState<SessionState>('idle');
  const [isListeningForWakeWord, setIsListeningForWakeWord] = useState(false);
  const [isAuraSpeaking, setIsAuraSpeaking] = useState(false);
  const [userTranscript, setUserTranscript] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    displayedText: displayedAuraTranscript,
    streamText: streamAuraTranscript,
    reset: resetAuraTranscript,
    isTyping: isAuraTyping,
  } = useSynchronizedTypewriter();
  
  const sessionPromiseRef = useRef<ReturnType<typeof startAuraSession> | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const outputGainNodeRef = useRef<GainNode | null>(null);
  const microphoneStreamRef = useRef<MediaStream | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const prevAuraTranscriptRef = useRef('');
  const stopInitiatedRef = useRef(false);
  const isGreetingPlayingRef = useRef(false);

  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const sessionStateRef = useRef(sessionState);

  useEffect(() => {
    sessionStateRef.current = sessionState;
  }, [sessionState]);
  
  useEffect(() => {
    const checkApiKey = async () => {
      // The hosting environment may take a moment to inject aistudio
      if ((window as any).aistudio && await (window as any).aistudio.hasSelectedApiKey()) {
        setIsKeySelected(true);
      }
    };
    checkApiKey();
    const timer = setTimeout(checkApiKey, 500); // Check again after a delay
    return () => clearTimeout(timer);
  }, []);

  const handleSelectKey = async () => {
    if ((window as any).aistudio) {
        await (window as any).aistudio.openSelectKey();
        // Assume success to avoid a race condition where hasSelectedApiKey() might not be updated yet.
        setIsKeySelected(true);
    }
  };


  const handleSetupSubmit = (user: string, assistant: string) => {
    setUserName(user);
    setAssistantName(assistant);
  };
  
  useEffect(() => {
    if(assistantName && sessionState === 'idle') {
      setIsListeningForWakeWord(true);
    }
  }, [assistantName, sessionState]);

  const cleanup = useCallback(() => {
    console.log('Cleaning up resources...');
    
    microphoneStreamRef.current?.getTracks().forEach(track => track.stop());
    microphoneStreamRef.current = null;
    
    if (scriptProcessorRef.current) {
        scriptProcessorRef.current.disconnect();
        scriptProcessorRef.current = null;
    }

    if (outputGainNodeRef.current) {
        outputGainNodeRef.current.disconnect();
        outputGainNodeRef.current = null;
    }

    inputAudioContextRef.current?.close().catch(console.error);
    inputAudioContextRef.current = null;
    outputAudioContextRef.current?.close().catch(console.error);
    outputAudioContextRef.current = null;

    sourcesRef.current.forEach(source => source.stop());
    sourcesRef.current.clear();
    nextStartTimeRef.current = 0;
    
    isGreetingPlayingRef.current = false;
    setIsAuraSpeaking(false);
  }, []);
  
  const initOutputAudio = useCallback(async () => {
    if (!outputAudioContextRef.current || outputAudioContextRef.current.state === 'closed') {
        outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: OUTPUT_SAMPLE_RATE });
    }
    if (outputAudioContextRef.current.state === 'suspended') {
        await outputAudioContextRef.current.resume();
    }
    if (!outputGainNodeRef.current) {
        const gainNode = outputAudioContextRef.current.createGain();
        gainNode.connect(outputAudioContextRef.current.destination);
        outputGainNodeRef.current = gainNode;
    }
    return { context: outputAudioContextRef.current, gainNode: outputGainNodeRef.current };
  }, []);
  
  const playSystemSound = useCallback((type: 'start' | 'end') => {
    const context = outputAudioContextRef.current;
    const outputGainNode = outputGainNodeRef.current;

    if (!context || context.state === 'closed' || !outputGainNode) {
      console.warn('Cannot play system sound, audio context or main gain node is not available.');
      return;
    }

    const oscillator = context.createOscillator();
    const gainNode = context.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(outputGainNode);

    gainNode.gain.setValueAtTime(0, context.currentTime);

    if (type === 'start') {
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(600, context.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.15, context.currentTime + 0.02);
      oscillator.frequency.exponentialRampToValueAtTime(1200, context.currentTime + 0.15);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.15);
      oscillator.start(context.currentTime);
      oscillator.stop(context.currentTime + 0.15);
    } else { // 'end'
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(1200, context.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.15, context.currentTime + 0.02);
      oscillator.frequency.exponentialRampToValueAtTime(600, context.currentTime + 0.2);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.2);
      oscillator.start(context.currentTime);
      oscillator.stop(context.currentTime + 0.2);
    }
  }, []);

  const handleStopSession = useCallback(async () => {
    if (sessionPromiseRef.current) {
        stopInitiatedRef.current = true;
        try {
            const session = await sessionPromiseRef.current;
            session.close();
        } catch (error) {
            console.error('Error closing session:', error);
            // If closing fails, manually clean up without sound
            cleanup();
            setSessionState('idle');
            stopInitiatedRef.current = false; // reset ref
        }
        sessionPromiseRef.current = null;
    }
  }, [cleanup]);
  
  const handleStartSession = useCallback(async (voiceName: string, stream: MediaStream, fromGreeting = false) => {
    if ((sessionStateRef.current !== 'idle' && sessionStateRef.current !== 'greeting') || !userName || !assistantName) return;

    if (!fromGreeting) {
        stopInitiatedRef.current = false;
        setErrorMessage(null);
        setIsListeningForWakeWord(false);
        setUserTranscript('');
        resetAuraTranscript();
        prevAuraTranscriptRef.current = '';
    }

    try {
      setSessionState('active');

      inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: INPUT_SAMPLE_RATE });
      await initOutputAudio();

      if (!fromGreeting) {
        playSystemSound('start');
      }

      sessionPromiseRef.current = startAuraSession(userName, assistantName, voiceName, {
        onopen: () => {
          console.log('Session opened.');
          const source = inputAudioContextRef.current!.createMediaStreamSource(stream);
          const scriptProcessor = inputAudioContextRef.current!.createScriptProcessor(BUFFER_SIZE, 1, 1);
          
          scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
            if (isGreetingPlayingRef.current) return;
            const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
            const pcmBlob = createPcmBlob(inputData);
            sessionPromiseRef.current?.then((session) => {
              session.sendRealtimeInput({ media: pcmBlob });
            });
          };

          source.connect(scriptProcessor);
          scriptProcessor.connect(inputAudioContextRef.current!.destination);
          scriptProcessorRef.current = scriptProcessor;
        },
        onmessage: async (message: LiveServerMessage) => {
          if (message.serverContent?.inputTranscription) {
            const currentTranscript = message.serverContent.inputTranscription.text;
            setUserTranscript(currentTranscript);
            const lowerTranscript = currentTranscript.toLowerCase();
            let newPreference: VoicePreference | null = null;
            if (lowerTranscript.includes("speak to a male")) {
                newPreference = 'male';
            } else if (lowerTranscript.includes("speak to a female")) {
                newPreference = 'female';
            }

            if (newPreference && newPreference !== voicePreference) {
                setVoicePreference(newPreference);
                streamAuraTranscript(`Okay, I will use a ${newPreference} voice for our next conversation.`, 4);
            }
          }
          
           if (message.serverContent?.turnComplete) {
            setUserTranscript('');
            prevAuraTranscriptRef.current = '';
          }
          
          const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
          if (base64Audio && outputAudioContextRef.current && outputGainNodeRef.current) {
             if (outputAudioContextRef.current.state === 'suspended') {
                await outputAudioContextRef.current.resume();
             }
             setIsAuraSpeaking(true);
             const audioBuffer = await decodeAudioData(decode(base64Audio), outputAudioContextRef.current, OUTPUT_SAMPLE_RATE, 1);
             const duration = audioBuffer.duration;
             
             const fullTranscript = message.serverContent.outputTranscription?.text ?? '';
             const prevTranscript = prevAuraTranscriptRef.current;

             if (fullTranscript.startsWith(prevTranscript)) {
                const newText = fullTranscript.substring(prevTranscript.length);
                if (newText) {
                    streamAuraTranscript(newText, duration);
                }
                prevAuraTranscriptRef.current = fullTranscript;
             }

             const currentTime = outputAudioContextRef.current.currentTime;
             nextStartTimeRef.current = Math.max(nextStartTimeRef.current, currentTime);

             const source = outputAudioContextRef.current.createBufferSource();
             source.buffer = audioBuffer;
             source.connect(outputGainNodeRef.current);
             
             source.addEventListener('ended', () => {
                sourcesRef.current.delete(source);
                if (sourcesRef.current.size === 0) {
                    setIsAuraSpeaking(false);
                }
             });

             source.start(nextStartTimeRef.current);
             nextStartTimeRef.current += audioBuffer.duration;
             sourcesRef.current.add(source);
          }
        },
        onerror: (e: ErrorEvent) => {
          console.error('Session error:', e);
          if (e.message.includes('not found') || e.message.includes('API_KEY_INVALID')) {
              setErrorMessage('Your API key appears to be invalid. Please select a valid key to continue.');
              setIsKeySelected(false);
          } else {
              setErrorMessage('Connection error. Please check your quota or network and try again.');
          }
          
          setSessionState('error');
          if (sessionPromiseRef.current) {
            sessionPromiseRef.current.then(session => session.close()).catch(err => console.error("Error closing session on error:", err));
            sessionPromiseRef.current = null;
          }
          cleanup();
        },
        onclose: (e: CloseEvent) => {
          console.log('Session closed.');
          if (sessionStateRef.current !== 'error') {
            if (stopInitiatedRef.current && outputAudioContextRef.current) {
              playSystemSound('end');
              setTimeout(() => {
                cleanup();
                setSessionState('idle');
              }, 300);
            } else {
              cleanup();
              setSessionState('idle');
            }
            stopInitiatedRef.current = false;
          }
        },
      });

    } catch (error) {
      console.error('Failed to start session:', error);
      setErrorMessage('Failed to access microphone. Please check permissions.');
      setSessionState('error');
      cleanup();
    }
  }, [userName, assistantName, voicePreference, cleanup, resetAuraTranscript, streamAuraTranscript, playSystemSound, initOutputAudio]);
  
  const startManualSession = useCallback(async () => {
    // This is for the user clicking the orb
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    microphoneStreamRef.current = stream;
    const voiceName = await determineVoice(voicePreference, stream);
    handleStartSession(voiceName, stream, false);
  }, [voicePreference, handleStartSession]);

  const handleWakeWordDetected = useCallback(async () => {
    if (sessionStateRef.current !== 'idle' || !userName) return;

    console.log("Wake word detected, preparing session.");
    setSessionState('greeting');
    setIsListeningForWakeWord(false);
    setErrorMessage(null);
    resetAuraTranscript();
    setUserTranscript('');

    const getTimeBasedGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'good morning';
        if (hour < 18) return 'good afternoon';
        return 'good evening';
    };
    const greetingText = `Hi ${userName}, a very ${getTimeBasedGreeting()}. How can I assist you?`;

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        microphoneStreamRef.current = stream;

        // Determine voice first to ensure greeting uses the correct voice
        const voiceName = await determineVoice(voicePreference, stream);
        
        // Then, generate the speech with that voice
        const audioData = await generateSpeech(greetingText, voiceName);
        
        // Set a flag to prevent mic input from being sent during greeting
        isGreetingPlayingRef.current = true;
        
        // Start the session in the background while the greeting prepares to play
        handleStartSession(voiceName, stream, true);

        // Play the greeting audio
        const { context, gainNode } = await initOutputAudio();
        
        const audioBuffer = await decodeAudioData(decode(audioData), context, OUTPUT_SAMPLE_RATE, 1);
        const source = context.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(gainNode);
        source.start();

        // When greeting finishes, unset the flag and play the 'start' chime to indicate listening
        source.onended = () => {
            isGreetingPlayingRef.current = false;
            if (sessionStateRef.current === 'active') {
                playSystemSound('start');
            }
        };
    } catch (error) {
        console.error('Failed to play greeting:', error);
        isGreetingPlayingRef.current = false; // Reset flag on error
        setErrorMessage('Could not generate greeting. Click the orb to start.');
        cleanup();
        setSessionState('error');
    }
}, [userName, voicePreference, handleStartSession, resetAuraTranscript, initOutputAudio, cleanup, playSystemSound]);

  useWakeWordListener({
    wakeWord: assistantName ? assistantName.toLowerCase() : '',
    isListening: isListeningForWakeWord,
    onWakeWord: handleWakeWordDetected,
  });

  if (!isKeySelected) {
    return (
        <div className="flex flex-col items-center justify-center h-screen bg-gray-900 text-gray-200 p-4">
            <div className="text-center max-w-md w-full bg-gray-800 p-8 rounded-lg shadow-2xl">
                <div className="flex justify-center mb-6">
                    <AuraLogo />
                </div>
                <h1 className="text-2xl font-medium text-gray-300 mb-2">API Key Required</h1>
                <p className="text-gray-400 mb-6">
                    To use this application, please select a Gemini API key. Your project may be subject to billing.
                    {' '}
                    <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">
                        Learn more
                    </a>.
                </p>
                <button
                    onClick={handleSelectKey}
                    className="w-full bg-indigo-600 text-white rounded-full py-3 font-semibold hover:bg-indigo-500 transition duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-indigo-500"
                >
                    Select API Key
                </button>
            </div>
        </div>
    );
  }

  if (!userName || !assistantName) {
    return <WelcomeScreen onSetupSubmit={handleSetupSubmit} />;
  }

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-gray-200">
       <VoiceInterface
          sessionState={sessionState}
          isAuraSpeaking={isAuraSpeaking}
          isAuraTyping={isAuraTyping}
          userTranscript={userTranscript}
          auraTranscript={displayedAuraTranscript}
          onToggleSession={() => (sessionState === 'active' ? handleStopSession() : startManualSession())}
          assistantName={assistantName}
          errorMessage={errorMessage}
        />
    </div>
  );
};

export default App;
