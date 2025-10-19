
import React from 'react';
import { AuraLogo } from './AuraLogo';

export const ThinkingIndicator: React.FC = () => {
  return (
    <div className="flex items-start space-x-4 mb-4">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center mt-1">
        <AuraLogo small />
      </div>
      <div className="max-w-prose p-4 rounded-xl bg-gray-800/50 text-gray-300 flex items-center space-x-2">
        <div className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse delay-0"></div>
        <div className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse delay-150"></div>
        <div className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse delay-300"></div>
      </div>
    </div>
  );
};
