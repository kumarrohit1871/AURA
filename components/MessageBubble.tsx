
import React from 'react';
import { ChatMessage } from '../types';
import { UserIcon } from './UserIcon';
import { AuraLogo } from './AuraLogo';

interface MessageBubbleProps {
  message: ChatMessage;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isModel = message.role === 'model';

  const bubbleClasses = isModel
    ? 'bg-gray-800/50 text-gray-300'
    : 'bg-indigo-600/80 text-white';

  const layoutClasses = isModel
    ? 'flex items-start space-x-4'
    : 'flex items-start flex-row-reverse space-x-4 space-x-reverse';
    
  // A simple markdown-to-html converter for bold text and lists
  const formatContent = (content: string) => {
    let html = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/^\s*-\s+(.*)/gm, '<li class="ml-4 list-disc">$1</li>');
    html = html.replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>');
    return { __html: html.replace(/\n/g, '<br />') };
  };


  return (
    <div className={`mb-4 ${layoutClasses}`}>
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center mt-1">
        {isModel ? <AuraLogo small /> : <UserIcon />}
      </div>
      <div className={`max-w-prose p-4 rounded-xl ${bubbleClasses}`}>
        <p className="text-sm leading-relaxed whitespace-pre-wrap" dangerouslySetInnerHTML={formatContent(message.content)}></p>
      </div>
    </div>
  );
};
