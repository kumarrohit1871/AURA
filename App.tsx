
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { WelcomeScreen } from './components/WelcomeScreen';
import { VoiceInterface } from './components/VoiceInterface';
import { startAuraSession, createPcmBlob } from './services/geminiService';
import { LiveServerMessage } from '@google/genai';
import { decode, decodeAudioData } from './utils/audio';
import { useWakeWordListener } from './hooks/useWakeWordListener';
import { useSynchronizedTypewriter } from './hooks/useSynchronizedTypewriter';
import { AuraLogo } from './components/AuraLogo';

// Constants for audio processing
const INPUT_SAMPLE_RATE = 16000;
const OUTPUT_SAMPLE_RATE = 24000;
const BUFFER_SIZE = 4096;

const App: React.FC = () => {
  const [isKeySelected, setIsKeySelected] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);
  const [assistantName, setAssistantName] = useState<string | null>(null);
  const [sessionState, setSessionState] = useState<'idle' | 'active' | 'error'>('idle');
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
  const microphoneStreamRef = useRef<MediaStream | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const prevAuraTranscriptRef = useRef('');
  const stopInitiatedRef = useRef(false);

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
    inputAudioContextRef.current?.close().catch(console.error);
    inputAudioContextRef.current = null;
    outputAudioContextRef.current?.close().catch(console.error);
    outputAudioContextRef.current = null;

    sourcesRef.current.forEach(source => source.stop());
    sourcesRef.current.clear();
    nextStartTimeRef.current = 0;

    setIsAuraSpeaking(false);
  }, []);
  
  const playSystemSound = useCallback((type: 'start' | 'end') => {
    const context = outputAudioContextRef.current;
    if (!context || context.state === 'closed') {
      console.warn('Cannot play system sound, audio context is not available.');
      return;
    }

    const oscillator = context.createOscillator();
    const gainNode = context.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(context.destination);

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
  
  const handleStartSession = useCallback(async () => {
    if (sessionState === 'active' || !userName || !assistantName) return;
    
    stopInitiatedRef.current = false; // Reset stop intention
    setErrorMessage(null);
    setIsListeningForWakeWord(false);
    setUserTranscript('');
    resetAuraTranscript();
    prevAuraTranscriptRef.current = '';
    setSessionState('active');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      microphoneStreamRef.current = stream;

      inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: INPUT_SAMPLE_RATE });
      outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: OUTPUT_SAMPLE_RATE });
      
      playSystemSound('start');

      sessionPromiseRef.current = startAuraSession(userName, assistantName, {
        onopen: () => {
          console.log('Session opened.');
          const source = inputAudioContextRef.current!.createMediaStreamSource(stream);
          const scriptProcessor = inputAudioContextRef.current!.createScriptProcessor(BUFFER_SIZE, 1, 1);
          
          scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
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
            setUserTranscript(message.serverContent.inputTranscription.text);
          }
          
           if (message.serverContent?.turnComplete) {
            setUserTranscript('');
            prevAuraTranscriptRef.current = '';
          }
          
          const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
          if (base64Audio && outputAudioContextRef.current) {
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
             source.connect(outputAudioContextRef.current.destination);
             
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
          // Per guidelines, if a "not found" error occurs, it's likely an API key issue.
          if (e.message.includes('not found') || e.message.includes('API_KEY_INVALID')) {
              setErrorMessage('Your API key appears to be invalid. Please select a valid key to continue.');
              setIsKeySelected(false); // Force re-selection
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
              // Delay cleanup to allow sound to play
              setTimeout(() => {
                cleanup();
                setSessionState('idle');
              }, 300); // Duration of end sound + buffer
            } else {
              // Unexpected close, cleanup immediately
              cleanup();
              setSessionState('idle');
            }
            stopInitiatedRef.current = false; // Reset for next session
          }
        },
      });

    } catch (error) {
      console.error('Failed to start session:', error);
      setErrorMessage('Failed to access microphone. Please check permissions.');
      setSessionState('error');
      cleanup();
    }
  }, [userName, assistantName, sessionState, cleanup, resetAuraTranscript, streamAuraTranscript, playSystemSound]);
  
  const handleWakeWordDetected = useCallback(() => {
    console.log("Wake word detected, starting session.");
    handleStartSession();
  }, [handleStartSession]);

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
          onToggleSession={() => (sessionState === 'active' ? handleStopSession() : handleStartSession())}
          userName={userName}
          assistantName={assistantName}
          errorMessage={errorMessage}
        />
    </div>
  );
};

export default App;
