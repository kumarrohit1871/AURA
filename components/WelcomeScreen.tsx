import React, { useState } from 'react';
import { AuraLogo } from './AuraLogo';

interface WelcomeScreenProps {
  onSetupSubmit: (userName: string, assistantName: string) => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onSetupSubmit }) => {
  const [userName, setUserName] = useState('');
  const [assistantName, setAssistantName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (userName.trim() && assistantName.trim()) {
      onSetupSubmit(userName.trim(), assistantName.trim());
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-900 text-gray-200 p-4">
      <div className="text-center max-w-sm w-full">
        <div className="flex justify-center mb-6">
          <AuraLogo />
        </div>
        <h1 className="text-3xl font-medium text-gray-300 mb-2">Welcome</h1>
        <p className="text-gray-400 mb-8">Let's get your assistant ready.</p>
        <form onSubmit={handleSubmit} className="flex flex-col space-y-4">
          <div>
            <label htmlFor="userName" className="block text-sm font-medium text-gray-400 text-left mb-2">What should I call you?</label>
            <input
              id="userName"
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="Enter your name"
              className="w-full bg-gray-800 border border-gray-700 rounded-full py-3 px-5 text-sm text-gray-200 placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-200 ease-in-out outline-none"
              autoFocus
            />
          </div>
          <div>
            <label htmlFor="assistantName" className="block text-sm font-medium text-gray-400 text-left mb-2">What name would you like for your assistant?</label>
            <input
              id="assistantName"
              type="text"
              value={assistantName}
              onChange={(e) => setAssistantName(e.target.value)}
              placeholder="e.g., Nova, Kai, Lyra"
              className="w-full bg-gray-800 border border-gray-700 rounded-full py-3 px-5 text-sm text-gray-200 placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-200 ease-in-out outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={!userName.trim() || !assistantName.trim()}
            className="!mt-8 bg-indigo-600 text-white rounded-full py-3 font-semibold hover:bg-indigo-500 disabled:bg-gray-600 disabled:cursor-not-allowed transition duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-indigo-500"
          >
            Continue
          </button>
        </form>
        <p className="text-gray-500 text-xs mt-8 text-center">by SRKR Technologies Ltd</p>
      </div>
    </div>
  );
};
