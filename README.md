# ChatCore — Real‑time Chat App (React + Node + Socket.IO + MongoDB)

ChatCore is a modern, full‑featured, real‑time messaging application that showcases production‑style patterns end‑to‑end. It supports 1:1 and group chats, rich media, read receipts, typing indicators, and an email‑based onboarding flow — all wrapped in a polished UI.

Perfect for GitHub and LinkedIn: use this README to understand the architecture, feature set, and how to run the project locally.

---

## ✨ Features

- Authentication and onboarding
  - Email OTP verification (nodemailer)
  - Password login
  - JWT sessions (httpOnly cookie)
- Realtime messaging
  - 1:1 and Group conversations
  - Online presence and typing indicators
  - Message receipts (sent, delivered, seen with double‑blue tick)
  - Unread counters and “New messages” dividers
- Messages
  - Text, images, video, documents, voice messages (record and send)
  - Reply threading with scroll‑to‑original
  - Forward to multiple chats
  - Star / Unstar messages (Starred panel)
  - Delete for me (local) and Delete for everyone (shows “This message was deleted” placeholder)
  - Clear chat (local cleanup)
- Conversations
  - Create and manage groups (name, avatar, add members)
  - Archive / Unarchive
  - Block / Unblock users
- Polished UI/UX
  - Modern responsive layout
  - Side panels for settings, starred, archived, blocked
  - File download with progress
  - Emoji picker
  - Toast notifications

---

## 🧱 Tech Stack

- Frontend: React (Vite), React Router, CSS Modules, lucide-react, react-hot-toast
- Realtime: Socket.IO (client + server)
- Backend: Node.js, Express.js
- Database: MongoDB (Mongoose)
- Auth: JWT (httpOnly cookies), bcrypt.js
- Emails: Nodemailer (Gmail via App Password recommended)
- Uploads: Multer (stores in /uploads folder)

---

## 🏗️ Architecture Overview

```
frontend/
  ├─ src/
  │  ├─ pages/
  │  │  └─ Chat, Login
  │  ├─ components/
  │  │  └─ chat/ (ChatSidebar, ChatWindow, panels, message components)
  │  ├─ contexts/ (AuthContext, SocketContext)
  │  ├─ services/api.js (REST client)
  │  └─ main.jsx, App.jsx
  └─ index.css

server/
  ├─ index.js (Express + Socket.IO bootstrap)
  ├─ Routes/
  │  ├─ authUser.js
  │  ├─ messageRouter.js
  │  └─ conversationRouter.js
  ├─ Controllers/
  │  ├─ userRouteController.js (auth + profile)
  │  ├─ userHandlerController.js (search + chatters sidebar)
  │  ├─ messageRouteController.js (messages, receipts, starred)
  │  └─ conversationController.js (groups, archive, ensure 1:1)
  ├─ socket/socketHandler.js (presence, typing, delivery/seen relays)
  ├─ Models/ (User, Message, Conversation)
  ├─ MiddleWares/isLoggedIn.js (JWT guard)
  ├─ DB/dbConnect.js
  └─ utils/emailService.js (OTP email)
```

Key flows:
- Client connects to Socket.IO, joins own room, receives online user updates and message events.
- Sending a message persists to MongoDB, emits “new-message” to sender and receiver (or group participants).
- Receipts:
  - On receive: markDelivered + socket “message-delivered”
  - On view: markSeen + socket “message-seen”
- Sidebar chat list is derived from Conversations and their latest visible message (ignores messages deleted for me or for everyone).

---

## 🖼️ Screens (placeholders)

Add your screenshots or recordings here:

- Login / OTP / Registration
- Chat list (sidebar) with unread badges
- 1:1 chat and Group chat
- Starred / Archived / Blocked panels
- Settings and Profile update
- Voice message UI

```
/docs/screens/01-login.png
/docs/screens/02-chat-list.png
/docs/screens/03-chat-window.png
```

---

## 🚀 Getting Started (Local)

### Prerequisites

- Node.js 18+
- MongoDB (local or cloud)
- Gmail App Password (recommended) for sending OTP emails

### 1) Server setup

```bash
cd server
npm install
cp .env.example .env   # create your .env (see variables below)
# or create .env manually
```

.env (server):

```
PORT=5000
MONGODB_CONNECT=mongodb://127.0.0.1:27017/chatcore
SECRET_KEY=your_jwt_secret_here

# Email (use Gmail App Password)
EMAIL_USER=youraddress@gmail.com
EMAIL_PASS=your_app_password_16_chars
```

Start the server:

```bash
# if you have nodemon
npm run dev
# or
node index.js
```

Server runs at http://localhost:5000

Uploads are served from http://localhost:5000/uploads

### 2) Frontend setup

```bash
cd frontend
npm install
```

.env (client):

```
# REST base (falls back to http://localhost:5000/api if not set)
REACT_APP_API_URL=http://localhost:5000/api
```

Start the client (Vite default port 5173):

```bash
npm run dev
```

Open http://localhost:5173

---

## 🔐 Email OTP Notes

The project uses Nodemailer with Gmail:
- Enable 2‑Step Verification on your Google account
- Create an App Password (16 characters)
- Set EMAIL_USER and EMAIL_PASS in server .env accordingly
- emailService will test configurations and log hints if misconfigured

---

## 🔌 Realtime Events

Socket rooms: each user joins their own userId room.

Emitted / listened events:
- join (server updates presence, publishes online users)
- new-message (incoming messages)
- message-delivered, message-seen (status updates)
- message-status-update (server relays to both parties)
- message-deleted-everyone (replace bubble with placeholder)
- typing-start, typing-stop (typing indicators)
- user-online, user-offline, online-users-update

---

## 🧪 Useful Scripts

Server:
- `npm run dev` (nodemon, if configured)
- `node index.js`

Client:
- `npm run dev` (Vite dev server)
- `npm run build` (production build)
- `npm run preview` (preview build locally)

---

## ⚙️ Environment Variables Reference

Server (.env):
- PORT — default 5000
- MONGODB_CONNECT — Mongo connection string
- SECRET_KEY — JWT signing secret
- EMAIL_USER — sender email (Gmail)
- EMAIL_PASS — Gmail App Password

Client (.env):
- REACT_APP_API_URL — REST base URL (e.g., http://localhost:5000/api)

Note: The client will fall back to `http://localhost:5000/api` if the variable is not provided.

---

## 🧩 Notable Implementation Details

- Read receipts stored per message: deliveredTo[], seenBy[]; UI computes ticks accordingly
- “Delete for everyone” sets `isDeletedForEveryone: true` (keeps an inline placeholder)
- Sidebar last message preview excludes messages deleted for me or for everyone
- Voice messages recorded via MediaRecorder API, uploaded as audio/webm
- File download UI shows a progress bar using ReadableStream

---

## 📦 API Overview (selected)

- Auth
  - POST /api/auth/check-email
  - POST /api/auth/verify-otp
  - POST /api/auth/verify-and-register
  - POST /api/auth/login-with-password
  - GET  /api/auth/me
  - POST /api/auth/logout
- Users
  - GET  /api/user/search?q=
  - GET  /api/user/getCurrentChatters
  - POST /api/user/update-profile
  - POST /api/user/block/:id
  - POST /api/user/unblock/:id
  - GET  /api/user/blocked/list
- Messages (1:1)
  - GET  /api/message/:userId
  - POST /api/message/send/:userId
  - POST /api/message/send-media/:userId
  - POST /api/message/delete/me
  - POST /api/message/delete/everyone
  - POST /api/message/forward
  - POST /api/message/:id/delivered
  - POST /api/message/:id/seen
  - GET  /api/message/:id/receipts
  - POST /api/message/star/:id
  - POST /api/message/unstar/:id
  - GET  /api/message/starred/list
  - DELETE /api/message/clear/:userId
- Groups (/api/conversation)
  - POST /group (create)
  - POST /group/:id/update
  - POST /group/:id/add-members
  - GET  /group/:id/members
  - POST /:conversationId/archive
  - POST /:conversationId/unarchive
  - GET  /archived/list
  - GET  /ensure/:otherUserId (ensure/find 1:1)

---

## 🛡️ Security & Privacy

- JWT in httpOnly cookies to mitigate XSS token theft
- Passwords hashed with bcrypt
- Email verification required before completing registration
- Server validates membership for group operations and message receipts

---

## 📈 Roadmap Ideas

- Message search
- Ephemeral messages
- Read receipts per‑member for groups (UI)
- Push notifications
- Cloud storage for media
- CI/CD & containerization

---

## 📝 License

This project is provided for learning and demonstration. Choose and add a license (e.g., MIT) if you plan to distribute.

---

## 🙌 Acknowledgements

- React, Vite, Socket.IO, Express, MongoDB
- lucide-react icons
- emoji-picker-react

If you find this useful, star the repo and share on LinkedIn!