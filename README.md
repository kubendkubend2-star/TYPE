# ⚡ TYPE CLASH — Competitive Real-Time Typing Battle Platform

TYPE CLASH is a production-ready, full-stack esports typing game that combines typing practice, racing dynamics, artificial intelligence opponents, and synchronized real-time 1v1 multiplayer friend battles.

---

## 🎮 Features

- **Solo Training Ground**: Battle realistic synthetic intelligences across 4 difficulty tiers (`Easy`, `Medium`, `Hard`, `Expert`) with human-like typing cadence, variable keystroke delays, and natural error corrections.
- **Synchronized 2-Player Battles**:
  - Unique, unpredictable 6-character room codes (e.g. `A7K9X2`).
  - Shareable battle invite URLs (`https://<domain>/battle/A7K9X2`).
  - Native **Web Share API** integration with one-click clipboard copying.
  - Strict 2-player capacity enforcement (rejects 3rd player with friendly notice).
  - Server-synchronized 3-2-1 countdown and simultaneous text delivery.
  - Real-time opponent progress streaming and dual racing HUD.
  - Server-authoritative match timer (60s) and verified score/winner determination.
- **Dual Authentication**:
  - **Google OAuth 2.0**: Official redirect flow with state preservation (invitees clicking an invite link who need to sign in return directly to their battle room).
  - **Email & Password**: Password hashing with `bcryptjs` (10 rounds) and stateless `JWT` tokens.
  - **Safe Account Linking**: Automatically links Google profiles to existing accounts with the same verified email.
- **Competitive Esports HUD**:
  - Dark cyberpunk aesthetic with neon cyan and purple accents, glassmorphic panels, and glowing borders.
  - Precise live caret tracking, character-by-character validation, and typo shake animations.
  - Copy/paste prevention (`onpaste="return false;"`) and character-skipping prevention.
  - Standardized WPM `(chars / 5) / (elapsedMinutes)` and Accuracy `%` calculations.
  - Procedural sound synthesizer powered by the **Web Audio API** (keystroke clicks, error buzzes, countdown beeps, and victory fanfare).
- **Persistent Leaderboard & User Profiles**:
  - Real MongoDB aggregation queries filtering by `Today`, `This Week`, and `All Time`.
  - Detailed user profiles displaying avatars, best WPM, accuracy, win rate, and recent match histories.
- **Zero-Friction Local Testing**:
  - Automatic development fallback to an in-memory MongoDB server when `MONGODB_URI` is not yet configured.

---

## 🛠️ Technology Stack

- **Frontend**: Vanilla HTML5, Vanilla CSS3 (custom esports cyber theme), Vanilla JavaScript (ES6+ modular client).
- **Backend**: Node.js, Express.js.
- **Real-Time Gateway**: Socket.IO.
- **Database & ODM**: MongoDB Atlas, Mongoose.
- **Authentication**: Google OAuth 2.0 (`passport-google-oauth20`), `jsonwebtoken`, `bcryptjs`.
- **Security**: Helmet, CORS, Express Rate Limiting.
- **Deployment Platform**: Render.

---

## 🚀 Quick Start (Local Development)

### 1. Prerequisites
- **Node.js**: v18+ (tested on Node.js v24 LTS)
- **npm**: v9+

### 2. Clone and Install Dependencies
```bash
git clone <your-repo-url>
cd TYPE
npm install
```

### 3. Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Default `.env` contents:
```env
MONGODB_URI=
JWT_SECRET=type_clash_secret_development_key_998822
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback
NODE_ENV=development
PORT=5000
```
*(Note: If `MONGODB_URI` is left blank in development, TYPE CLASH automatically launches an in-memory MongoDB instance for instant testing!)*

### 4. Run the Application
```bash
npm start
```
Open your browser at:
```
http://localhost:5000
```

---

## ☁️ Google Cloud Console OAuth 2.0 Setup

To enable "Continue with Google" sign-in:

1. Visit the [Google Cloud Console](https://console.cloud.google.com/).
2. Click the project dropdown in the top bar and click **New Project**. Name it `TYPE-CLASH` and click **Create**.
3. In the left navigation, go to **APIs & Services** → **OAuth consent screen**.
4. Select **External** user type and click **Create**.
5. Fill in the required fields:
   - **App name**: `TYPE CLASH`
   - **User support email**: Your email address
   - **Developer contact information**: Your email address
6. Click **Save and Continue** through Scopes (the default `.../auth/userinfo.email` and `.../auth/userinfo.profile` are sufficient).
7. Under **Test users**, add your personal Google email address to test while the app is in testing mode. Click **Save and Continue**.
8. In the left menu, click **Credentials** → **Create Credentials** → **OAuth Client ID**.
9. Select **Web application** under Application type.
10. Set **Name**: `TYPE CLASH Web Client`.
11. Under **Authorized redirect URIs**, add both development and production callback URLs:
    - Development: `http://localhost:5000/api/auth/google/callback`
    - Production (Render): `https://YOUR-RENDER-SERVICE.onrender.com/api/auth/google/callback`
12. Click **Create**.
13. Copy the **Client ID** and **Client Secret**.
14. Paste them into your `.env` file:
    ```env
    GOOGLE_CLIENT_ID=1234567890-abcdef.apps.googleusercontent.com
    GOOGLE_CLIENT_SECRET=GOCSPX-yourClientSecret
    GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback
    ```

---

## 🍃 MongoDB Atlas Setup

1. Sign up or log into [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Click **Create** to deploy a free **M0 Shared Cluster**.
3. Under **Security Quickstart**:
   - Create a database user with username and a secure password (e.g. `typeclash_user`). Save the password.
4. Under **Network Access**:
   - Add IP Address `0.0.0.0/0` (Allow Access from Anywhere) so Render servers and your local machine can connect.
5. In your cluster dashboard, click **Connect** → **Drivers** (Node.js).
6. Copy the connection string. It will look like:
   ```
   mongodb+srv://typeclash_user:<password>@cluster0.abcde.mongodb.net/typeclash?retryWrites=true&w=majority
   ```
7. Replace `<password>` with your database user's password and paste it as `MONGODB_URI` in your `.env` file and Render Environment Variables.

---

## 🐙 GitHub Repository Setup

1. Initialize git in your project directory:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: Production-ready TYPE CLASH platform"
   ```
2. Create a new repository on [GitHub](https://github.com/new) named `type-clash`.
3. Link and push your repository:
   ```bash
   git remote add origin https://github.com/<your-username>/type-clash.git
   git branch -M main
   git push -u origin main
   ```
*(Your `.gitignore` file ensures `.env` and `node_modules/` are never committed).*

---

## 🚀 Render Deployment Guide

1. Log into [Render](https://render.com/).
2. In the dashboard, click **New +** → **Web Service**.
3. Connect your GitHub account and select your `type-clash` repository.
4. Configure the Web Service settings:
   - **Name**: `type-clash` (or your preferred name)
   - **Region**: Closest to your users (e.g., Oregon, Frankfurt, Singapore)
   - **Branch**: `main`
   - **Root Directory**: Leave blank (uses repository root)
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node backend/server.js`
   - **Plan Type**: `Free`
5. Click **Advanced** → **Add Environment Variable** and add the following:
   | Key | Value | Description |
   |---|---|---|
   | `NODE_ENV` | `production` | Enables production mode |
   | `MONGODB_URI` | `mongodb+srv://...` | Your MongoDB Atlas connection string |
   | `JWT_SECRET` | `your_super_secret_jwt_key` | Long random cryptographic string |
   | `GOOGLE_CLIENT_ID` | `your_google_client_id` | From Google Cloud Console |
   | `GOOGLE_CLIENT_SECRET` | `your_google_client_secret` | From Google Cloud Console |
   | `GOOGLE_CALLBACK_URL` | `https://your-service.onrender.com/api/auth/google/callback` | Production callback URL |
6. Click **Create Web Service**.
7. Render will build and deploy TYPE CLASH.
8. Once live, test `https://your-service.onrender.com/api/health` to confirm `{"status": "OK", "database": "connected"}`.

---

## 🧪 Automated Testing

TYPE CLASH includes automated test scripts verifying backend health, authentication, stats updates, and real-time Socket.IO multiplayer battles:

Run the automated multiplayer test suite:
```bash
node backend/test-multiplayer.js
```
This test automatically simulates:
- Player 1 room creation
- Player 2 invite room joining
- 3rd player room-full rejection
- Ready status toggling
- Synchronized countdown sequence
- Live typing progress broadcasting
- Authoritative winner calculation and MongoDB persistence

---

## 📄 License

MIT License © 2026 TYPE CLASH Team.
