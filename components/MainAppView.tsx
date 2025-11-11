import React from 'react';
import { UserProfile } from './UserProfile';
import { VoiceInterface } from './VoiceInterface';

export const MainAppView = ({
  // User Profile props
  displayName,
  userName,
  onLogout,
  voicePreference,
  onVoicePreferenceChange,
  history,
  isSidebarExpanded,
  onToggleSidebar,
  // Voice Interface props
  sessionState,
  isAuraSpeaking,
  isAuraTyping,
  userTranscript,
  auraTranscript,
  onToggleSession,
  assistantName,
  errorMessage,
}) => {
  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-gray-100">
      <UserProfile 
        displayName={displayName}
        userName={userName}
        onLogout={onLogout}
        voicePreference={voicePreference}
        onVoicePreferenceChange={onVoicePreferenceChange}
        history={history}
        assistantName={assistantName}
        isSidebarExpanded={isSidebarExpanded}
        onToggleSidebar={onToggleSidebar}
      />
      <main className="flex-1 flex flex-col">
        <VoiceInterface
          sessionState={sessionState}
          isAuraSpeaking={isAuraSpeaking}
          isAuraTyping={isAuraTyping}
          userTranscript={userTranscript}
          auraTranscript={auraTranscript}
          onToggleSession={onToggleSession}
          assistantName={assistantName}
          errorMessage={errorMessage}
        />
      </main>
    </div>
  );
};
