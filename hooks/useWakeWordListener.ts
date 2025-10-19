import { useEffect, useRef } from 'react';

// FIX: Add type definitions for the Web Speech API to resolve TypeScript errors.
// These types are not standard in all TypeScript DOM library versions.
interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionResult {
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
  length: number;
}

interface SpeechRecognitionResultList {
  [index: number]: SpeechRecognitionResult;
  length: number;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  onend: () => void;
  start: () => void;
  stop: () => void;
}

// FIX: Access SpeechRecognition from window as `any` to avoid property-does-not-exist error
// and handle vendor prefixes.
const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

interface UseWakeWordListenerParams {
  wakeWord: string;
  isListening: boolean;
  onWakeWord: () => void;
}

export const useWakeWordListener = ({ wakeWord, isListening, onWakeWord }: UseWakeWordListenerParams) => {
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const wakeWordDetectedRef = useRef(false);

  useEffect(() => {
    if (!SpeechRecognition || !wakeWord) {
      if (!wakeWord) return; // Don't log error until wake word is available
      console.error('Speech Recognition API not supported in this browser.');
      return;
    }

    if (!recognitionRef.current) {
      const recognition: SpeechRecognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = Array.from(event.results)
          .map((result) => result[0])
          .map((result) => result.transcript)
          .join('')
          .toLowerCase();

        if (transcript.includes(wakeWord.toLowerCase()) && !wakeWordDetectedRef.current) {
          console.log('Wake word detected!');
          wakeWordDetectedRef.current = true;
          onWakeWord();
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        if (event.error !== 'no-speech' && event.error !== 'aborted') {
          console.error('Speech recognition error:', event.error);
        }
      };
      
      recognition.onend = () => {
        if (isListening) {
          try {
            recognition.start();
          } catch (e) {
             // Already started, ignore
          }
        }
      };

      recognitionRef.current = recognition;
    }

    const recognition = recognitionRef.current;
    
    if (isListening) {
      wakeWordDetectedRef.current = false;
      try {
        recognition.start();
        console.log(`Listening for wake word: "${wakeWord}"`);
      } catch (e) {
         console.warn('Could not start recognition, it might already be running.', e);
      }
    } else {
      recognition.stop();
      console.log('Wake word listener stopped.');
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        console.log('Wake word listener stopped on cleanup.');
      }
    };
  }, [isListening, onWakeWord, wakeWord]);
};
