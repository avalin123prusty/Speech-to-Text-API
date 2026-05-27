# Speech-to-Text Client

This frontend is a React + Vite application for uploading or recording audio and sending it to the backend for transcription.

## Setup

1. Open a terminal in `client/`
2. Install dependencies:

```bash
npm install
```

3. Start the app:

```bash
npm run dev
```

## Notes

- The frontend expects the backend API at `http://localhost:4000` by default.
- If you want to use a different backend URL, add `VITE_API_URL` to `client/.env` or set it in your deployment environment.

## Deployment

### Netlify

- Build command: `npm run build`
- Publish directory: `dist`
- Set `VITE_API_URL` to your backend URL in Netlify environment variables.

### Vercel

- Framework preset: Vite
- Build command: `npm run build`
- Output directory: `dist`
- Set `VITE_API_URL` to your backend URL in Vercel environment variables.

## Workflow

- Upload an audio file
- Or record audio using your browser microphone
- Click `Upload and transcribe`
- View transcription results and history
