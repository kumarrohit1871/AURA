# AURA - Personal AI Voice Assistant

## Overview
AURA is an emotionally intelligent voice-activated personal assistant built with React, TypeScript, and Google's Gemini AI. The assistant features real-time voice interaction, wake-word detection, and multilingual support.

**Current State**: Fully configured and running on Replit. The application is ready for use in development and can be deployed to production.

## Project Architecture

### Tech Stack
- **Frontend**: React 19 with TypeScript
- **Build Tool**: Vite 6.4
- **AI Service**: Google Gemini 2.5 Flash (Native Audio Preview)
- **Styling**: Tailwind CSS (via CDN)
- **Audio**: Web Audio API for real-time processing

### Key Features
- Real-time voice interaction with AI assistant
- Wake word detection (customizable assistant name)
- Synchronized text transcription with audio playback
- Multilingual support with automatic language detection
- Emotional intelligence and empathetic responses
- Audio streaming with 16kHz input and 24kHz output

### Project Structure
```
/
├── components/          # React components
│   ├── WelcomeScreen.tsx    # Initial setup screen
│   ├── VoiceInterface.tsx   # Main voice interaction UI
│   ├── ChatWindow.tsx       # Message display
│   ├── MessageBubble.tsx    # Individual message component
│   ├── InputBar.tsx         # User input component
│   ├── ThinkingIndicator.tsx # AI processing indicator
│   └── ...
├── hooks/              # Custom React hooks
│   ├── useWakeWordListener.ts    # Wake word detection
│   └── useSynchronizedTypewriter.ts # Text animation
├── services/           # API services
│   └── geminiService.ts # Gemini AI integration
├── utils/              # Utility functions
│   ├── audio.ts        # Audio processing utilities
│   └── languages.ts    # Language detection
├── App.tsx            # Main application component
├── index.tsx          # Application entry point
├── vite.config.ts     # Vite configuration
└── tsconfig.json      # TypeScript configuration
```

## Recent Changes
**October 23, 2025**
- Configured Vite server for Replit environment
- Updated port from 3000 to 5000 (Replit standard)
- Added `allowedHosts` configuration for Replit proxy domains (.repl.co, .replit.dev, .replit.app)
- Set up deployment configuration for autoscale deployments
- Configured HMR (Hot Module Replacement) for HTTPS environment

## Environment Setup

### Required Secrets
- `GEMINI_API_KEY`: Google Gemini API key from https://aistudio.google.com/apikey

### Development Server
```bash
npm run dev
```
Runs on port 5000 with host 0.0.0.0 (required for Replit webview)

### Build & Preview
```bash
npm run build
npm run preview
```

### Deployment
The app is configured for Replit Autoscale deployments:
- Build command: `npm run build`
- Run command: `npm run preview`
- Deployment target: Autoscale (stateless web app)

## Configuration Details

### Vite Configuration (vite.config.ts)
- **Port**: 5000 (Replit standard)
- **Host**: 0.0.0.0 (allows external connections)
- **Allowed Hosts**: Replit proxy domains for security
- **HMR**: Configured for HTTPS on port 443
- **Environment Variables**: GEMINI_API_KEY injected via process.env

### Audio Processing
- **Input Sample Rate**: 16kHz (microphone input)
- **Output Sample Rate**: 24kHz (AI voice output)
- **Buffer Size**: 4096 samples
- **Format**: PCM audio for Gemini API

## User Workflow
1. User enters their name and chooses an assistant name
2. Wake word listener activates (listening for assistant name)
3. User says the assistant's name to trigger conversation
4. Real-time audio streaming begins
5. Transcriptions appear synchronized with audio playback
6. Session ends when user stops, or automatically on completion

## AI Configuration
The assistant uses a sophisticated system prompt that includes:
- Multilingual support with automatic language detection
- Emotional intelligence framework
- Mindful inquiry and empathetic validation
- Adaptive tone based on user's emotional state
- Voice: Zephyr (Google's preset voice)

## Known Considerations
- The app uses Tailwind CSS via CDN (suitable for development; consider PostCSS for production optimization)
- WebSocket HMR may show connection warnings in development (expected behavior in Replit's HTTPS environment)
- Audio permissions must be granted by the user's browser for microphone access
- The app requires HTTPS for microphone access (automatically provided by Replit)

## Dependencies
- **react**: ^19.2.0 - UI framework
- **react-dom**: ^19.2.0 - React DOM rendering
- **@google/genai**: ^1.25.0 - Gemini AI SDK
- **vite**: ^6.2.0 - Build tool and dev server
- **typescript**: ~5.8.2 - Type safety
- **@vitejs/plugin-react**: ^5.0.0 - React plugin for Vite
- **@types/node**: ^22.14.0 - Node.js type definitions

## User Preferences
None specified yet. This section will be updated as the user expresses preferences about coding style, workflow, or features.
