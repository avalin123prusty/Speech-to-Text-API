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
- If you want to use a different backend URL, add a `VITE_API_URL` environment variable to `client/.env`.

## Workflow

- Upload an audio file
- Or record audio using your browser microphone
- Click `Upload and transcribe`
- View transcription results and history
