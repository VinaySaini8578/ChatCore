const express = require("express");  
const http = require("http");       // Socket.io needs a low level http server 
const { Server } = require("socket.io"); // import only Server class from sockets to add our server to it
const cors = require("cors");       // allows request from frontend

const server = express();
const httpServer = http.createServer(server); //wrapping express server with http for SOCKET 
// to run both sockets and API on same server ; Express - > Api and http - > Socket

// Create Socket.IO server for real time messaging on HTTP server
const io = new Server(httpServer, {
    cors: {               // to connect frontend to socket
        origin: "http://localhost:5173", // only serve requests from this front-end for this socket
        methods: ["GET", "POST"],        // Allowed HTTP methods
        credentials: true                // Allow cookies and credentials
    }
});

// Allow frontend Requests for Backend (this time not for socket)
server.use(cors({
    origin: "http://localhost:5173", // only serve requests from this front-end
    credentials: true
}));

server.use(express.json()); // to easily get json data from frontend

// For reading cookies easily (used for authentication, e.g. JWT tokens)
const cookieParser = require("cookie-parser");
server.use(cookieParser());

// Set the socket server in Express API via 
server.set('io', io);


const { handleSocketConnection } = require("./socket/socketHandler.js");
// When a new client connects to Socket.IO, call your handler function
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

server.use("/uploads", express.static("uploads"));

// Database connection
const dbConnect = require("./DB/dbConnect.js");

const dotenv = require("dotenv");
dotenv.config();   // transfer environment variables to process.env
const PORT = process.env.PORT || 5000;

// need to listen on http server to facilitate Sockets
httpServer.listen(PORT, () => {
    dbConnect();
    console.log(`Server is running on port ${PORT}`);
    console.log("Socket.IO is ready for connections");
});