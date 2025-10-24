<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1JID_dLLIaLGiDkpAazoQC8HIvCB7K43K

## Run Locally

**Prerequisites:** Node.js 18+

1. Install dependencies: `npm install`
2. Create a `.env` from the provided `.env.example` and set your key:
   - `VITE_GEMINI_API_KEY=your_api_key_here`
3. Start the dev server: `npm run dev`
   - The app listens on `http://localhost:5000` by default. If your platform sets `PORT`, it will honor that.

## Deploy / Run Online

This project uses Vite and works on most hosts (Vercel, Netlify, Render, Railway, Codespaces, Replit, etc.).

- Build: `npm run build`
- Preview locally: `npm run preview`
- Configure environment variable in your host dashboard:
  - `VITE_GEMINI_API_KEY` set to your Gemini API key
- Ensure the platform forwards the assigned port to the container; the app binds to `0.0.0.0` and honors `PORT`.
