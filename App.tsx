import React, { useState, useRef, useCallback, useEffect } from 'react';
import { WelcomeScreen } from './components/WelcomeScreen';
import { VoiceInterface } from './components/VoiceInterface';
import { startAuraSession, createPcmBlob } from './services/geminiService';
import { LiveServerMessage } from '@google/genai';
import { decode, decodeAudioData } from './utils/audio';
import { useWakeWordListener } from './hooks/useWakeWordListener';

// Constants for audio processing
const INPUT_SAMPLE_RATE = 16000;
const OUTPUT_SAMPLE_RATE = 24000;
const BUFFER_SIZE = 4096;

const App: React.FC = () => {
  const [userName, setUserName] = useState<string | null>(null);
  const [assistantName, setAssistantName] = useState<string | null>(null);
  const [sessionState, setSessionState] = useState<'idle' | 'active' | 'error'>('idle');
  const [isListeningForWakeWord, setIsListeningForWakeWord] = useState(false);
  const [isAuraSpeaking, setIsAuraSpeaking] = useState(false);
  const [userTranscript, setUserTranscript] = useState('');
  const [auraTranscript, setAuraTranscript] = useState('');
  
  const sessionPromiseRef = useRef<ReturnType<typeof startAuraSession> | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const microphoneStreamRef = useRef<MediaStream | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);

  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  const handleNameSubmit = (user: string, assistant: string) => {
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

    setSessionState('idle');
    setIsAuraSpeaking(false);
  }, []);

  const handleStopSession = useCallback(async () => {
    if (sessionPromiseRef.current) {
        try {
            const session = await sessionPromiseRef.current;
            session.close();
        } catch (error) {
            console.error('Error closing session:', error);
        }
        sessionPromiseRef.current = null;
    }
    cleanup();
  }, [cleanup]);
  
  const handleStartSession = useCallback(async () => {
    if (sessionState === 'active' || !userName || !assistantName) return;
    
    setIsListeningForWakeWord(false);
    setUserTranscript('');
    setAuraTranscript('');
    setSessionState('active');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      microphoneStreamRef.current = stream;

      inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: INPUT_SAMPLE_RATE });
      outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: OUTPUT_SAMPLE_RATE });

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
          if (message.serverContent?.outputTranscription) {
            setAuraTranscript(message.serverContent.outputTranscription.text);
          }
           if (message.serverContent?.turnComplete) {
            setUserTranscript('');
            setAuraTranscript('');
          }
          
          const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
          if (base64Audio && outputAudioContextRef.current) {
             setIsAuraSpeaking(true);
             const audioBuffer = await decodeAudioData(decode(base64Audio), outputAudioContextRef.current, OUTPUT_SAMPLE_RATE, 1);
             
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
          setSessionState('error');
          handleStopSession();
        },
        onclose: (e: CloseEvent) => {
          console.log('Session closed.');
          handleStopSession();
        },
      });

    } catch (error) {
      console.error('Failed to start session:', error);
      setSessionState('error');
      cleanup();
    }
  }, [userName, assistantName, sessionState, cleanup, handleStopSession]);
  
  const handleWakeWordDetected = useCallback(() => {
    console.log("Wake word detected, starting session.");
    handleStartSession();
  }, [handleStartSession]);

  useWakeWordListener({
    wakeWord: assistantName ? assistantName.toLowerCase() : '',
    isListening: isListeningForWakeWord,
    onWakeWord: handleWakeWordDetected,
  });

  if (!userName || !assistantName) {
    return <WelcomeScreen onNameSubmit={handleNameSubmit} />;
  }

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-gray-200">
       <VoiceInterface
          sessionState={sessionState}
          isAuraSpeaking={isAuraSpeaking}
          userTranscript={userTranscript}
          auraTranscript={auraTranscript}
          onToggleSession={() => (sessionState === 'active' ? handleStopSession() : handleStartSession())}
          userName={userName}
          assistantName={assistantName}
        />
    </div>
  );
};

export default App;