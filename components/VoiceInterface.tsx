import React from 'react';
import { AuraLogo } from './AuraLogo';

interface VoiceInterfaceProps {
  sessionState: 'idle' | 'active' | 'error';
  isAuraSpeaking: boolean;
  userTranscript: string;
  auraTranscript: string;
  userName: string;
  assistantName: string;
  onToggleSession: () => void;
}

const getStatusText = (state: VoiceInterfaceProps['sessionState'], isSpeaking: boolean, assistantName: string) => {
    if (state === 'error') return 'An error occurred. Please try again.';
    if (state === 'active') {
        if (isSpeaking) return `${assistantName} is speaking...`;
        return 'Listening...';
    }
    return `Say "${assistantName}" to begin.`;
}

export const VoiceInterface: React.FC<VoiceInterfaceProps> = ({
  sessionState,
  isAuraSpeaking,
  userTranscript,
  auraTranscript,
  userName,
  assistantName,
  onToggleSession,
}) => {

  const orbState = sessionState === 'active' 
    ? (isAuraSpeaking ? 'speaking' : 'listening') 
    : 'idle';

  return (
    <div className="flex flex-col h-full items-center justify-between text-center p-8">
       <header className="w-full flex items-center justify-center space-x-3 h-16">
        <AuraLogo />
        <h1 className="text-xl font-medium tracking-wider text-gray-300">{assistantName}</h1>
      </header>

      <main className="flex flex-col items-center justify-center flex-1 w-full max-w-2xl">
        <div className="w-full h-24 mb-8 transition-opacity duration-300 ease-in-out">
            <p className="text-xl text-gray-400 h-1/2">{userTranscript}&nbsp;</p>
            <p className="text-2xl text-gray-100 font-medium h-1/2">{auraTranscript}&nbsp;</p>
        </div>

        <button 
            onClick={onToggleSession} 
            disabled={sessionState === 'error'}
            className="relative w-48 h-48 rounded-full flex items-center justify-center transition-transform duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-indigo-500/50"
            aria-label={sessionState === 'active' ? 'End Session' : 'Start Session'}
            >
            <div className={`absolute inset-0 rounded-full bg-indigo-800 transition-all duration-500 ease-in-out ${orbState === 'listening' ? 'animate-pulse' : ''} ${orbState === 'speaking' ? 'scale-110 opacity-100' : 'opacity-50'} ${orbState === 'idle' ? 'animate-pulse-slow' : ''}`} />
            <div className="relative w-32 h-32 rounded-full flex items-center justify-center bg-gray-900">
                <AuraLogo />
            </div>
        </button>
      </main>

      <footer className="w-full h-16 flex items-center justify-center">
        <p className="text-sm text-gray-400 transition-opacity duration-300 ease-in-out">
            {getStatusText(sessionState, isAuraSpeaking, assistantName)}
        </p>
      </footer>
    </div>
  );
};