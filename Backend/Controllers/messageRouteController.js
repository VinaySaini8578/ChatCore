const Conversation = require("../Models/conversationModel");
const Message = require("../Models/messageModel");
const { Types } = require("mongoose");
const { onlineUsers } = require("../socket/socketHandler");

const clearChat = async (req, res) => {
    try {
        const { receiverId } = req.params;
        const senderId = req.user._id;

        const senderObjId = new Types.ObjectId(senderId);
        const receiverObjId = new Types.ObjectId(receiverId);

        const conversation = await Conversation.findOne({
            participants: { $all: [senderObjId, receiverObjId] }
        });

        if (!conversation) {
            return res.status(200).json({ success: true, message: "No conversation found" });
        }

        const messagesToDelete = await Message.find({
            conversationId: conversation._id,
            deletedBy: { $ne: senderObjId }
        });

        if (messagesToDelete.length === 0) {
            return res.status(200).json({ success: false, message: "No chats to clear" });
        }

        await Message.updateMany(
            { conversationId: conversation._id, deletedBy: { $ne: senderObjId } },
            { $push: { deletedBy: senderObjId } }
        );

        return res.status(200).json({ success: true, message: "Chat cleared for you only." });
    } catch (error) {
        console.log("clearChat error:", error);
        return res.status(200).json({ success: false, message: "Failed to clear chat", error: error.message });
    }
};

const getMessages = async (req, res) => {
    try {
        const { receiverId } = req.params;
        const senderId = req.user._id;

        const conversation = await Conversation.findOne({
            participants: { $all: [senderId, receiverId] }
        });

        if (!conversation) return res.status(200).json([]);

        const messages = await Message.find({
            conversationId: conversation._id,
            deletedBy: { $ne: senderId }
        }).populate("senderId", "fullname username profilepic");

        res.status(200).json(messages);
    } catch (error) {
        console.log("getMessages error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

const sendMessage = async (req, res) => {
    try {
        const { message } = req.body;
        const { receiverId } = req.params;
        const senderId = req.user._id;
        let conversation = await Conversation.findOne({
            participants: { $all: [senderId, receiverId] },
        });

        if (!conversation) {
            conversation = await Conversation.create({
                participants: [senderId, receiverId]
            });
        }

        let status = "sent";
        if (onlineUsers.has(receiverId.toString())) {
            status = "delivered";
        }

        const newMessage = new Message({
            senderId,
            receiverId,
            message,
            conversationId: conversation._id,
            status
        });

        conversation.messages.push(newMessage._id);

        await Promise.all([conversation.save(), newMessage.save()]);
        await newMessage.populate('senderId', 'fullname username profilepic');

        const io = req.app.get('io');
        if (io) {
            io.to(senderId.toString()).emit("new-message", newMessage);
            io.to(receiverId).emit("new-message", newMessage);
        }

        res.status(201).json(newMessage);
    } catch (error) {
        console.log("sendMessage error:", error);
        res.status(500).json({ success: false, message: "Message send failed" });
    }
};
const deleteMessagesForMe = async (req, res) => {
    try {
        const { messageIds } = req.body;
        const userId = req.user._id;
        if (!Array.isArray(messageIds) || messageIds.length === 0) {
            return res.status(400).json({ success: false, message: "No message ids provided" });
        }
        await Message.updateMany(
            { _id: { $in: messageIds }, deletedBy: { $ne: userId } },
            { $push: { deletedBy: userId } }
        );
        res.status(200).json({ success: true, message: "Deleted for you" });
    } catch (err) {
        res.status(500).json({ success: false, message: "Failed to delete for me" });
    }
};

const deleteMessagesForEveryone = async (req, res) => {
    try {
        const { messageIds } = req.body;
        const userId = req.user._id;
        const messages = await Message.find({ _id: { $in: messageIds } });

        const allowed = messages.every(msg => msg.senderId.toString() === userId.toString());
        if (!allowed) {
            return res.status(403).json({ success: false, message: "Unauthorized" });
        }

        await Message.updateMany(
            { _id: { $in: messageIds } },
            { $set: { isDeletedForEveryone: true, message: "This message was deleted" } }
        );
        await Message.updateMany(
            { _id: { $in: messageIds } },
            { $set: { deletedBy: [] } }
        );

        const io = req.app.get('io');
        messages.forEach(msg => {
            io.to(msg.senderId.toString()).emit("message-deleted-everyone", { messageId: msg._id });
            io.to(msg.receiverId.toString()).emit("message-deleted-everyone", { messageId: msg._id });
        });

        res.status(200).json({ success: true, message: "Deleted for everyone" });
    } catch (err) {
        res.status(500).json({ success: false, message: "Failed to delete for everyone" });
    }
};

const sendMediaMessage = async (req, res) => {
    try {
        const { receiverId } = req.params;
        const senderId = req.user._id;
        let conversation = await Conversation.findOne({
            participants: { $all: [senderId, receiverId] }
        });
        if (!conversation) {
            conversation = await Conversation.create({
                participants: [senderId, receiverId]
            });
        }
        const mediaUrl = req.file ? `/uploads/${req.file.filename}` : "";
        const mediaSize = req.file ? req.file.size : 0;
        let status = "sent";
        if (onlineUsers.has(receiverId.toString())) {
            status = "delivered";
        }
        const newMessage = new Message({
            senderId,
            receiverId,
            message: "",
            media: mediaUrl,
            mediaSize,
            conversationId: conversation._id,
            status
        });
        conversation.messages.push(newMessage._id);
        await Promise.all([conversation.save(), newMessage.save()]);
        await newMessage.populate('senderId', 'fullname username profilepic');
        const io = req.app.get('io');
        if (io) {
            io.to(senderId.toString()).emit("new-message", newMessage);
            io.to(receiverId).emit("new-message", newMessage);
        }
        res.status(201).json(newMessage);
    } catch (error) {
        console.log("sendMediaMessage error:", error);
        res.status(500).json({ success: false, message: "Failed to send media" });
    }
};

module.exports = { sendMessage, getMessages, clearChat, deleteMessagesForMe, deleteMessagesForEveryone, sendMediaMessage };