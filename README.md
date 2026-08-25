# ChatApp Professional

A responsive WhatsApp-inspired real-time chat application built with React, Express, Socket.IO, and MongoDB.

## Features

- Real-time direct and group conversations
- Secure JWT-authenticated REST and Socket.IO sessions
- Online status, typing indicators, unread badges, and sent/delivered/read ticks
- Image sharing with preview and captions
- PDF, Word, Excel, PowerPoint, text, CSV, Markdown, RTF, and OpenDocument sharing
- Upload progress, 25 MB size limit, server-side extension/MIME checks, UUID filenames
- Reply, forward, download, emoji reaction UI, password reset email flow
- Responsive mobile/desktop layout, animated glass UI, and reduced-motion accessibility
- Restricted CORS, security headers, API rate limiting, and room membership authorization

## Requirements

- Node.js 18 or newer
- MongoDB locally or MongoDB Atlas

## Easiest local run — one URL (Windows CMD)

```bat
cd chatapp-intern
npm run install:all
copy backend\.env.example backend\.env
copy frontend\.env.example frontend\.env
```

Edit `backend/.env` and set `MONGODB_URI` and a random `JWT_SECRET` of at least 32 characters. Email settings are only required for password-reset emails.

Then run:

```bat
npm start
```

The command builds the frontend, starts the backend, and prints:

```text
ChatApp is ready: http://localhost:5000
```

Open exactly `http://localhost:5000`. The backend now serves the website at `/`; it no longer returns `Not Found`.

## Developer mode — two terminals

Use this when changing frontend code and you need automatic refresh:

```bat
npm run dev:backend
```

```bat
npm run dev:frontend
```

Open `http://localhost:3000`. Opening `http://localhost:5000` in developer mode automatically redirects to the frontend when no production build exists.

You can also run the frontend directly:

```bat
cd frontend
npm run dev
```

## One URL (macOS/Linux)

```bash
npm run install:all
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
npm start
```

Open `http://localhost:5000`.

## Supported attachments

Images: JPG, PNG, GIF, WebP. Documents: PDF, DOC/DOCX, XLS/XLSX, PPT/PPTX, TXT, CSV, Markdown, RTF, ODT, ODS, ODP. The maximum size is 25 MB per file. Executables and arbitrary archives are intentionally blocked.

## Production notes

- Set `CLIENT_URL` to the exact frontend URL. Multiple trusted origins can be comma-separated.
- Set `REACT_APP_SERVER_URL` to the deployed backend URL before building the frontend.
- Local `backend/uploads` storage is suitable for development. Render's filesystem is ephemeral; use Cloudinary, S3, or another persistent object store for permanent production attachments.
- Never commit `.env` files. Rotate any credentials that were previously committed or shared.

## If a URL shows Not Found

- Website URL: `http://localhost:5000` after running `npm start` from the project root.
- Developer frontend URL: `http://localhost:3000` after running `npm run dev:frontend`.
- Backend health URL: `http://localhost:5000/api/health`.
- Do not add `/api` twice. Correct: `/api/users/login`; wrong: `/api/api/users/login`.
- On Render with separate services, open the frontend Static Site URL—not the backend URL. Set backend `CLIENT_URL` to the frontend URL and frontend `REACT_APP_SERVER_URL` to the backend URL.
- On Render with one combined Web Service, build from the project root using `npm run install:all && npm run build`, start using `npm start --prefix backend`, and set `CLIENT_URL` to that service's public URL.

## Verify

```bash
npm run check
```
