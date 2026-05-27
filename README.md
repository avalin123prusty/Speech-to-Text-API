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

## Project progress

- [x] Day 1: Project setup and choose API
- [x] Day 2: Backend setup (Express + multer)
- [x] Day 3: Database setup (MongoDB + Mongoose)
- [x] Day 4: Speech-to-Text integration
- [x] Day 5: Frontend UI (upload & recorder)
- [x] Day 6: Connect frontend to backend
- [x] Day 7: Store transcriptions in DB & history
- [x] Day 8: UI enhancements (Tailwind)
- [x] Day 9: Error handling & validation
- [x] Day 10: Authentication & user sessions
- [x] Day 11: Deploy backend
- [x] Day 12: Deploy frontend
- [x] Day 13: Final testing & debugging
- [x] Day 14: Documentation & project submission

## Prerequisites

- Node.js v18+ installed
- MongoDB Atlas or local MongoDB connection string
- OpenAI API key

## Backend setup

1. Open a terminal in `server/`
2. Run `npm install`
3. Copy `server/.env.example` to `server/.env`
4. Set environment variables:

```env
OPENAI_API_KEY=your_openai_api_key
MONGODB_URI=your_mongodb_connection_string
PORT=4000
CORS_ORIGIN=http://localhost:5173
JWT_SECRET=replace_this_with_a_long_random_secret
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

Backend deployment:

- Use services like Render, Railway, Heroku, or a Docker-hosting platform.
- For Render, `render.yaml` is included and configures a Node web service using `server/`.
- Ensure the backend environment has:
  - `OPENAI_API_KEY`
  - `MONGODB_URI`
  - `PORT`
  - `CORS_ORIGIN` (set to your frontend origin or `*` if needed)
  - `JWT_SECRET`

Frontend deployment:

- Use Netlify or Vercel from the `client/` folder.
- `client/` includes `netlify.toml` and `vercel.json` for static app deployment.
- Set `VITE_API_URL` in the deployment environment to your backend URL.

Example environment variables for frontend deployment:

```
VITE_API_URL=https://your-backend.example.com
```

Example environment variables for backend deployment:

```
OPENAI_API_KEY=your_openai_key
MONGODB_URI=your_mongo_connection_string
PORT=4000
CORS_ORIGIN=https://your-frontend.example.com
JWT_SECRET=replace_this_with_a_long_random_secret
```

### Render backend setup

1. Connect this repository to Render.
2. Create a new Web Service and point it at the root of the repo.
3. Render will use `render.yaml` to configure the backend service.
4. Set the following environment variables in Render:
   - `OPENAI_API_KEY`
   - `MONGODB_URI`
   - `JWT_SECRET`
   - `CORS_ORIGIN` (e.g. `https://your-netlify-site.netlify.app`)
   - `PORT` (optional; Render provides one automatically)

### Netlify setup

1. Connect the `client/` folder to Netlify.
2. Set the build command to `npm run build`.
3. Set the publish directory to `dist`.
4. Add environment variable `VITE_API_URL` with your deployed backend URL.

### Vercel setup

1. Import the `client/` folder as a Vercel project.
2. Use `npm run build` as the build command.
3. Use `dist` as the output directory.
4. Add environment variable `VITE_API_URL` with your deployed backend URL.

## Final testing and debugging

Before submission:

1. Run the backend locally and verify API routes work.
2. Run the frontend locally and confirm upload/record/submit flows.
3. Test login/register and transcription history.
4. Test error cases:
   - uploading unsupported file types
   - uploading files larger than 40MB
   - missing backend or missing OpenAI key
5. Confirm the deployed frontend can reach the deployed backend via `VITE_API_URL` and CORS.

## Documentation & cleanup

- Keep the README updated with setup and deployment steps.
- Remove unwanted test or debug logs from the code.
- Keep the backend logs focused on warnings and actual errors.

## Backend Docker deployment

From the repository root, build and run the backend container:

```bash
docker build -t speech-to-text-server ./server
docker run --env-file server/.env -p 4000:4000 speech-to-text-server
```

When deployed, set your frontend `VITE_API_URL` to the backend URL and use `CORS_ORIGIN` to allow the frontend origin.

## Future improvements

- Add authentication and user accounts
- Add better validation and error handling
- Add deploy scripts and environment-specific config
- Support additional speech-to-text providers like Google or Deepgram
