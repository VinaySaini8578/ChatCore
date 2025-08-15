const User = require("../Models/userModel.js");
const Message = require("../Models/messageModel.js");

const onlineUsers = new Map();

const handleSocketConnection = (io, socket) => {
    console.log("User connected:", socket.id);

    socket.on("join", async (userId) => {
        try {
            console.log("User joining:", userId);

            // Update user online status in database
            await User.findByIdAndUpdate(userId, {
                isOnline: true,
                lastSeen: new Date()
            });

            // Fetch any pending messages for this user
            const pendingMessages = await Message.find({
                receiverId: userId,
                status: "sent"
            });
            for (let msg of pendingMessages) {
                msg.status = "delivered";
                await msg.save();
                io.to(msg.senderId.toString()).emit("message-status-update", {
                    messageId: msg._id,
                    status: "delivered"
                });
                io.to(userId.toString()).emit("message-status-update", {
                    messageId: msg._id,
                    status: "delivered"
                });
            }

            const user = await User.findById(userId).select("-password -emailVerificationCode");
            if (user) {
                // Store user info with socket
                onlineUsers.set(userId, {
                    socketId: socket.id,
                    user: user,
                    lastSeen: new Date()
                });

                socket.userId = userId;
                socket.join(userId);
                
                console.log(`User ${user.fullname} joined room ${userId}`);
                
                // Create consistent online users list
                const onlineUsersList = Array.from(onlineUsers.values()).map(userData => ({
                    userId: userData.user._id,
                    user: userData.user
                }));
                
                // Send initial list to the newly connected user
                socket.emit("online-users", onlineUsersList);
                
                // Broadcast that this user is online to ALL other users
                socket.broadcast.emit("user-online", {
                    userId: userId,
                    user: user
                });
                
                // Send updated online users list to ALL users
                io.emit("online-users-update", onlineUsersList);
                
                console.log(`User ${user.fullname} joined with socket ${socket.id}`);
                console.log(`Total online users: ${onlineUsers.size}`);
            }
        } catch (error) {
            console.error("Error in join event:", error);
        }
    });

    socket.on("typing-start", (data) => {
        const { receiverId, senderName } = data;
        socket.to(receiverId).emit("user-typing", {
            senderId: socket.userId,
            senderName: senderName
        });
    });

    socket.on("message-delivered", async ({ messageId }) => {
        try {
            const message = await Message.findByIdAndUpdate(messageId, { status: "delivered" }, { new: true });
            if (message) {
                console.log(`Message ${messageId} marked as delivered`);
                io.to(message.senderId.toString()).emit("message-status-update", { messageId, status: "delivered" });
                io.to(message.receiverId.toString()).emit("message-status-update", { messageId, status: "delivered" });
            }
        } catch (error) {
            console.error("Error updating message status to delivered:", error);
        }
    });

    socket.on("message-seen", async ({ messageId }) => {
        try {
            const message = await Message.findByIdAndUpdate(messageId, { status: "seen" }, { new: true });
            if (message) {
                console.log(`Message ${messageId} marked as seen`);
                io.to(message.senderId.toString()).emit("message-status-update", { messageId, status: "seen" });
                io.to(message.receiverId.toString()).emit("message-status-update", { messageId, status: "seen" });
            }
        } catch (error) {
            console.error("Error updating message status to seen:", error);
        }
    });

    // WebRTC call signaling (basic relay between peers)
    socket.on("call-user", ({ toUserId, offer, callType }) => {
        socket.to(toUserId).emit("incoming-call", {
            fromUserId: socket.userId,
            offer,
            callType
        });
    });

    socket.on("answer-call", ({ toUserId, answer }) => {
        socket.to(toUserId).emit("call-answered", {
            fromUserId: socket.userId,
            answer
        });
    });

    socket.on("ice-candidate", ({ toUserId, candidate }) => {
        socket.to(toUserId).emit("ice-candidate", { fromUserId: socket.userId, candidate });
    });

    socket.on("end-call", ({ toUserId }) => {
        socket.to(toUserId).emit("call-ended", { fromUserId: socket.userId });
    });

    socket.on("typing-stop", (data) => {
        const { receiverId } = data;
        socket.to(receiverId).emit("user-stopped-typing", {
            senderId: socket.userId
        });
    });

    socket.on("disconnect", async () => {
        console.log("User disconnecting:", socket.userId);
        
        if (socket.userId) {
            // Update user offline status in database
            await User.findByIdAndUpdate(socket.userId, {
                isOnline: false,
                lastSeen: new Date()
            });

            // Remove from online users
            onlineUsers.delete(socket.userId);
            
            // Notify all users that this user went offline
            socket.broadcast.emit("user-offline", {
                userId: socket.userId
            });
            
            // Send updated online users list to everyone
            const onlineUsersList = Array.from(onlineUsers.values()).map(userData => ({
                userId: userData.user._id,
                user: userData.user
            }));
            io.emit("online-users-update", onlineUsersList);
            
            console.log(`User ${socket.userId} disconnected`);
            console.log(`Remaining online users: ${onlineUsers.size}`);
        }
    });

    socket.on("error", (error) => {
        console.error("Socket error:", error);
    });
};

const getOnlineUsers = () => {
    return Array.from(onlineUsers.keys());
};

const isUserOnline = (userId) => {
    return onlineUsers.has(userId);
};

module.exports = {
    handleSocketConnection,
    getOnlineUsers,
    isUserOnline,
    onlineUsers
};