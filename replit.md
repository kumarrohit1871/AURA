# AURA - Personal AI Voice Assistant

## Overview
AURA is an emotionally intelligent voice-based personal assistant powered by Google's Gemini AI. The assistant provides empathetic, natural conversations with real-time audio processing and multilingual support.

## Project Architecture
- **Framework**: React 19 + TypeScript
- **Build Tool**: Vite
- **AI Service**: Google Gemini 2.5 Flash with native audio preview
- **Audio Processing**: Web Audio API for real-time voice interaction
- **Styling**: Tailwind CSS (via CDN)

## Key Features
- Wake word detection for hands-free activation
- Real-time voice conversation with synchronized transcription
- Multilingual support with automatic language detection
- Emotionally intelligent responses based on tone and context
- Personalized assistant with custom names

## Environment Setup
- **Port**: 5000 (configured for Replit)
- **Required Secret**: GEMINI_API_KEY (Google AI Studio API key)
- **Host Configuration**: 0.0.0.0 with HMR clientPort 443 for Replit proxy

## File Structure
- `/components/` - React UI components
- `/hooks/` - Custom React hooks (wake word listener, typewriter effect)
- `/services/` - Gemini AI integration service
- `/utils/` - Audio processing and language utilities
- `vite.config.ts` - Vite configuration with environment variables

## Recent Changes (October 23, 2025)
- Configured for Replit environment
- Updated server port from 3000 to 5000
- Added HMR configuration for Replit proxy support
- Installed all npm dependencies
- Set up GEMINI_API_KEY secret
- Configured deployment with autoscale target

## Dependencies
- react@^19.2.0
- @google/genai@^1.25.0
- vite@^6.2.0
- typescript@~5.8.2

## Development
Run `npm run dev` to start the development server on port 5000.

## Deployment
The app is configured for autoscale deployment, which builds the app and serves it using Vite preview mode.
