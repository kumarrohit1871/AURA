import { useEffect, useRef } from 'react';

// Fix: Use type assertion for SpeechRecognition and webkitSpeechRecognition
const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

export const useWakeWordListener = ({ wakeWord, isListening, onWakeWord }) => {
  const recognitionRef = useRef(null);
  const wakeWordDetectedRef = useRef(false);

  useEffect(() => {
    if (!SpeechRecognition || !wakeWord) {
      if (!wakeWord) return; // Don't log error until wake word is available
      console.error('Speech Recognition API not supported in this browser.');
      return;
    }

    if (!recognitionRef.current) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      // We don't set 'recognition.lang' to allow the browser to auto-detect.

      recognition.onresult = (event) => {
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

      recognition.onerror = (event) => {
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
