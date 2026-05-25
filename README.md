# Speech-to-Text API Project

This project lets users upload or record audio, transcribe it with OpenAI Whisper, and save transcription history in MongoDB.

## What is implemented

- React + Vite frontend with a file upload form and audio recording support
- Tailwind CSS styling
- Express backend with `multer` file upload handling
- OpenAI Whisper transcription integration
- MongoDB storage using Mongoose
- Transcript history fetch and display

## Project structure

- `client/` - React frontend
- `server/` - Express backend
- `server/models/Transcription.js` - Mongoose model for saved transcriptions

## Prerequisites

- Node.js v18+ installed
- MongoDB Atlas or local MongoDB connection string
- OpenAI API key

## Backend setup

1. Open a terminal in `server/`
2. Run `npm install`
3. Copy `.env.example` to `.env`
4. Set environment variables:

```env
OPENAI_API_KEY=your_openai_api_key
MONGODB_URI=your_mongodb_connection_string
PORT=4000
```

5. Start the backend:

```bash
npm run dev
```

The backend will run at `http://localhost:4000`.

## Frontend setup

1. Open a terminal in `client/`
2. Run `npm install`
3. Start the frontend:

```bash
npm run dev
```

By default, the frontend runs at `http://localhost:5173`.

## How to use

1. Open the frontend in your browser
2. Upload an audio file or record audio with the recorder controls
3. Click `Upload and transcribe`
4. The transcription will appear on screen and the history will update

## Notes

- The backend uses CORS for `http://localhost:5173`
- If you want to deploy, set the frontend `VITE_API_URL` for the backend URL
- The current transcription provider is OpenAI Whisper

## Deployment

Quick deployment notes:

- Backend (Node/Express + MongoDB): You can deploy to services like Render, Railway, or Heroku. Ensure `OPENAI_API_KEY` and `MONGODB_URI` are set in the platform's environment variables.
- Frontend (Vite/React): Deploy to Vercel or Netlify. Configure `VITE_API_URL` to point to the deployed backend.

Example environment variables to set on the host:

```
OPENAI_API_KEY=your_openai_key
MONGODB_URI=your_mongo_connection_string
PORT=4000
VITE_API_URL=https://your-backend.example.com
```

If you want, I can add deployment-specific config files for Vercel or a `Dockerfile` for containerized deployment.

## Future improvements

- Add authentication and user accounts
- Add better validation and error handling
- Add deploy scripts and environment-specific config
- Support additional speech-to-text providers like Google or Deepgram
