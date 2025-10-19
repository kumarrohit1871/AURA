import { useState, useCallback, useRef, useEffect } from 'react';

export const useSynchronizedTypewriter = () => {
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  
  const queueRef = useRef<{ text: string; duration: number }[]>([]);
  const isProcessingRef = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const processQueue = useCallback(() => {
    if (isProcessingRef.current || queueRef.current.length === 0) {
      return;
    }

    isProcessingRef.current = true;
    setIsTyping(true);
    const { text, duration } = queueRef.current.shift()!;
    const words = text.trim().split(/\s+/).filter(Boolean);

    if (words.length === 0 || duration <= 0) {
      setDisplayedText((prev) => (prev + text).trimStart());
      isProcessingRef.current = false;
      if (queueRef.current.length === 0) setIsTyping(false);
      processQueue();
      return;
    }

    const delayPerWord = (duration * 1000) / words.length;
    let wordIndex = 0;

    const typeNextWord = () => {
      if (wordIndex < words.length) {
        setDisplayedText((prev) => `${prev} ${words[wordIndex]}`.trimStart());
        wordIndex++;
        timeoutRef.current = setTimeout(typeNextWord, delayPerWord);
      } else {
        timeoutRef.current = null;
        isProcessingRef.current = false;
        if (queueRef.current.length === 0) setIsTyping(false);
        processQueue();
      }
    };

    typeNextWord();
  }, []);

  const streamText = useCallback(
    (textChunk: string, durationInSeconds: number) => {
      queueRef.current.push({ text: textChunk, duration: durationInSeconds });
      processQueue();
    },
    [processQueue]
  );

  const reset = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    queueRef.current = [];
    isProcessingRef.current = false;
    setDisplayedText('');
    setIsTyping(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return { displayedText, streamText, reset, isTyping };
};
