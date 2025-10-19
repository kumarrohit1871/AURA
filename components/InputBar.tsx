
import React, { useState } from 'react';
import { SendIcon } from './SendIcon';

interface InputBarProps {
  onSendMessage: (input: string) => void;
  isLoading: boolean;
}

export const InputBar: React.FC<InputBarProps> = ({ onSendMessage, isLoading }) => {
  const [input, setInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      onSendMessage(input);
      setInput('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center space-x-2">
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Ask AURA anything..."
        disabled={isLoading}
        className="flex-1 w-full bg-gray-800 border border-gray-700 rounded-full py-3 px-5 text-sm text-gray-200 placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-200 ease-in-out outline-none disabled:opacity-50"
      />
      <button
        type="submit"
        disabled={isLoading || !input.trim()}
        className="bg-indigo-600 text-white rounded-full p-3 flex-shrink-0 hover:bg-indigo-500 disabled:bg-gray-600 disabled:cursor-not-allowed transition duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-indigo-500"
      >
        <SendIcon />
      </button>
    </form>
  );
};
