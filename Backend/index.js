const express = require("express");  
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const server = express();
const httpServer = http.createServer(server);

const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true
  }
});

server.use(cors({
  origin: "http://localhost:5173",
  credentials: true
}));

server.use(express.json());
const cookieParser = require("cookie-parser");
server.use(cookieParser());

server.set('io', io);

const { handleSocketConnection } = require("./socket/socketHandler.js");
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);
  handleSocketConnection(io, socket);
});

// Routes
const authUserRouter = require("./Routes/authUser.js");
server.use("/api/auth", authUserRouter);

const messageRouter = require("./Routes/messageRouter.js");
server.use("/api/message", messageRouter);

const userRouter = require("./Routes/usersRouter.js");
server.use("/api/user", userRouter);

// NEW conversation router (groups + archive)
const conversationRouter = require("./Routes/conversationRouter.js");
server.use("/api/conversation", conversationRouter);

server.use("/uploads", express.static("uploads"));

// Database connection
const dbConnect = require("./DB/dbConnect.js");

const dotenv = require("dotenv");
dotenv.config();
const PORT = process.env.PORT || 5000;

httpServer.listen(PORT, () => {
  dbConnect();
  console.log(`Server is running on port ${PORT}`);
  console.log("Socket.IO is ready for connections");
});