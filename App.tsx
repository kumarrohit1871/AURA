import React, { useState, useRef, useCallback, useEffect } from 'react';
import { WelcomeScreen } from './components/WelcomeScreen';
import { VoiceInterface } from './components/VoiceInterface';
import { startAuraSession, createPcmBlob, generateSpeech } from './services/geminiService';
import { decode, decodeAudioData } from './utils/audio';
import { useWakeWordListener } from './hooks/useWakeWordListener';
import { useSynchronizedTypewriter } from './hooks/useSynchronizedTypewriter';
import { checkExistingUser, logout } from './services/auth';
import { MainAppView } from './components/MainAppView';
import { dbGetVoicePreference, dbSaveVoicePreference, dbAddConversation, dbGetConversationHistory } from './services/database';
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
const findDominantFreq = (dataArray, sampleRate, fftSize) => {
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
const determineVoice = (preference, stream) => {
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
    // Fix: Use type assertion for webkitAudioContext
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
    
    const samples = [];
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

const ApiKeyScreen = ({ onSelectApiKey }) => {
  return (
    <div className="flex items-center justify-center h-screen bg-gradient-to-br from-gray-900 to-gray-800">
      <div className="bg-gray-900/80 border border-gray-800 rounded-2xl p-8 max-w-lg text-center shadow-2xl">
        <div className="mx-auto mb-6 w-max">
            <AuraLogo />
        </div>
        <h2 className="text-3xl font-bold text-gray-100 mb-4">API Key Required</h2>
        <p className="text-gray-400 mb-8">
          To use this application, please select a Gemini API key. Your project may be subject to billing.
          <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline ml-1">Learn more</a>.
        </p>
        <button onClick={onSelectApiKey} className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 rounded-full font-semibold hover:brightness-110 transition-all text-lg">
          Select API Key
        </button>
      </div>
    </div>
  );
};

const App = () => {
  const [apiKeyReady, setApiKeyReady] = useState(false);
  const [userName, setUserName] = useState(null);
  const [displayName, setDisplayName] = useState(null);
  const [assistantName, setAssistantName] = useState(null);
  const [voicePreference, setVoicePreference] = useState('auto');
  const [sessionState, setSessionState] = useState('idle');
  const [isListeningForWakeWord, setIsListeningForWakeWord] = useState(false);
  const [isAuraSpeaking, setIsAuraSpeaking] = useState(false);
  const [userTranscript, setUserTranscript] = useState('');
  const [errorMessage, setErrorMessage] = useState(null);
  const [history, setHistory] = useState([]);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);

  const {
    displayedText: displayedAuraTranscript,
    streamText: streamAuraTranscript,
    reset: resetAuraTranscript,
    isTyping: isAuraTyping,
  } = useSynchronizedTypewriter();
  
  const sessionPromiseRef = useRef(null);
  const inputAudioContextRef = useRef(null);
  const outputAudioContextRef = useRef(null);
  const outputGainNodeRef = useRef(null);
  const microphoneStreamRef = useRef(null);
  const scriptProcessorRef = useRef(null);
  const prevAuraTranscriptRef = useRef('');
  const stopInitiatedRef = useRef(false);
  const isGreetingPlayingRef = useRef(false);
  const finalUserTranscriptRef = useRef('');
  const finalAuraTranscriptRef = useRef('');

  const nextStartTimeRef = useRef(0);
  // Fix: Specify the type for the Set in the useRef hook to fix 'stop' does not exist error.
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const sessionStateRef = useRef(sessionState);

  useEffect(() => {
    sessionStateRef.current = sessionState;
  }, [sessionState]);
  
  // This useEffect will run once on mount to check for an API key.
  useEffect(() => {
    if ((window as any).aistudio) {
        const checkApiKey = async () => {
            if (await (window as any).aistudio.hasSelectedApiKey()) {
                setApiKeyReady(true);
            }
        };
        checkApiKey();
    } else {
        console.warn('AI Studio context not found. Assuming API key is set via environment.');
        setApiKeyReady(true);
    }
  }, []);

  // This useEffect will run once on mount to check for existing user data.
  useEffect(() => {
    const user = checkExistingUser();
    if (user) {
        setUserName(user.userName);
        setDisplayName(user.displayName);
        setAssistantName(user.assistantName);
        setVoicePreference(dbGetVoicePreference());
        setHistory(dbGetConversationHistory());
    }
  }, []); // Empty dependency array ensures it runs only once.


  const handleSetupSubmit = (user, display, assistant) => {
    setUserName(user);
    setDisplayName(display);
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
        // Fix: Use type assertion for webkitAudioContext
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
  
  const playSystemSound = useCallback((type) => {
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
  
  const handleStartSession = useCallback(async (voiceName, stream, fromGreeting = false) => {
    if ((sessionStateRef.current !== 'idle' && sessionStateRef.current !== 'greeting') || !displayName || !assistantName) return;

    if (!fromGreeting) {
        stopInitiatedRef.current = false;
        setErrorMessage(null);
        setIsListeningForWakeWord(false);
        setUserTranscript('');
        resetAuraTranscript();
        prevAuraTranscriptRef.current = '';
        finalUserTranscriptRef.current = '';
        finalAuraTranscriptRef.current = '';
    }

    try {
      setSessionState('active');

      // Fix: Use type assertion for webkitAudioContext
      inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: INPUT_SAMPLE_RATE });
      await initOutputAudio();

      if (!fromGreeting) {
        playSystemSound('start');
      }

      sessionPromiseRef.current = startAuraSession(displayName, assistantName, voiceName, {
        onopen: () => {
          console.log('Session opened.');
          const source = inputAudioContextRef.current.createMediaStreamSource(stream);
          const scriptProcessor = inputAudioContextRef.current.createScriptProcessor(BUFFER_SIZE, 1, 1);
          
          scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
            if (isGreetingPlayingRef.current) return;
            const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
            const pcmBlob = createPcmBlob(inputData);
            sessionPromiseRef.current?.then((session) => {
              session.sendRealtimeInput({ media: pcmBlob });
            });
          };

          source.connect(scriptProcessor);
          scriptProcessor.connect(inputAudioContextRef.current.destination);
          scriptProcessorRef.current = scriptProcessor;
        },
        onmessage: async (message) => {
          if (message.serverContent?.inputTranscription) {
            const currentTranscript = message.serverContent.inputTranscription.text;
            setUserTranscript(currentTranscript);
            finalUserTranscriptRef.current = currentTranscript; // Store final transcript
            
            const lowerTranscript = currentTranscript.toLowerCase();
            let newPreference = null;
            if (lowerTranscript.includes("speak with a male voice")) {
                newPreference = 'male';
            } else if (lowerTranscript.includes("speak with a female voice")) {
                newPreference = 'female';
            }

            if (newPreference && newPreference !== voicePreference) {
                handleVoicePreferenceChange(newPreference);
                streamAuraTranscript(`Okay, I will use a ${newPreference} voice for our next conversation.`, 4);
            }
          }
          
           if (message.serverContent?.turnComplete) {
            dbAddConversation(finalUserTranscriptRef.current, finalAuraTranscriptRef.current);
            setHistory(dbGetConversationHistory());

            setUserTranscript('');
            prevAuraTranscriptRef.current = '';
            finalUserTranscriptRef.current = '';
            finalAuraTranscriptRef.current = '';
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
             finalAuraTranscriptRef.current = fullTranscript; // Store final transcript
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
        onerror: (e) => {
          console.error('Session error:', e);
          const errorMessage = (e.message || '').toLowerCase();
          
          if (errorMessage.includes('not found') || 
              errorMessage.includes('api_key_invalid') ||
              errorMessage.includes('network error') ||
              errorMessage.includes('permission denied')) {
              
              setErrorMessage('API key validation failed. Please select a valid key.');
              setApiKeyReady(false);
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
        onclose: (e) => {
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
  }, [displayName, assistantName, voicePreference, cleanup, resetAuraTranscript, streamAuraTranscript, playSystemSound, initOutputAudio]);
  
  const startManualSession = useCallback(async () => {
    // This is for the user clicking the orb
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    microphoneStreamRef.current = stream;
    const voiceName = await determineVoice(voicePreference, stream);
    handleStartSession(voiceName, stream, false);
  }, [voicePreference, handleStartSession]);

  const handleWakeWordDetected = useCallback(async () => {
    if (sessionStateRef.current !== 'idle' || !displayName) return;

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
    const greetingText = `Hi ${displayName}, a very ${getTimeBasedGreeting()}. How can I assist you?`;

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
}, [displayName, voicePreference, handleStartSession, resetAuraTranscript, initOutputAudio, cleanup, playSystemSound]);

  useWakeWordListener({
    wakeWord: assistantName ? assistantName.toLowerCase() : '',
    isListening: isListeningForWakeWord,
    onWakeWord: handleWakeWordDetected,
  });

  const handleLogout = () => {
    handleStopSession();
    setUserName(null);
    setDisplayName(null);
    setAssistantName(null);
    logout();
  };

  const handleVoicePreferenceChange = (preference) => {
    setVoicePreference(preference);
    dbSaveVoicePreference(preference);
  };
  
  const handleToggleSidebar = () => {
    setIsSidebarExpanded(prev => !prev);
  };
  
  const handleSelectApiKey = async () => {
    await (window as any).aistudio.openSelectKey();
    setApiKeyReady(true);
  };

  if (!apiKeyReady) {
    return <ApiKeyScreen onSelectApiKey={handleSelectApiKey} />;
  }

  if (!userName || !assistantName || !displayName) {
    return <WelcomeScreen onSetupSubmit={handleSetupSubmit} />;
  }

  return (
    <MainAppView
      displayName={displayName}
      userName={userName}
      onLogout={handleLogout}
      sessionState={sessionState}
      isAuraSpeaking={isAuraSpeaking}
      isAuraTyping={isAuraTyping}
      userTranscript={userTranscript}
      auraTranscript={displayedAuraTranscript}
      onToggleSession={() => (sessionState === 'active' ? handleStopSession() : startManualSession())}
      assistantName={assistantName}
      errorMessage={errorMessage}
      voicePreference={voicePreference}
      onVoicePreferenceChange={handleVoicePreferenceChange}
      history={history}
      isSidebarExpanded={isSidebarExpanded}
      onToggleSidebar={handleToggleSidebar}
    />
  );
};

export default App;