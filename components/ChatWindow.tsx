
import React, { useEffect, useRef } from 'react';
import { ChatMessage } from '../types';
import { MessageBubble } from './MessageBubble';
import { ThinkingIndicator } from './ThinkingIndicator';

interface ChatWindowProps {
  messages: ChatMessage[];
  isLoading: boolean;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ messages, isLoading }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-6">
      <div className="max-w-3xl mx-auto w-full">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        {isLoading && messages.length > 0 && <ThinkingIndicator />}
      </div>
    </div>
  );
};
