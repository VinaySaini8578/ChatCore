const Conversation = require("../Models/conversationModel");
const Message = require("../Models/messageModel");
const User = require("../Models/userModel");
const { Types } = require("mongoose");
const { onlineUsers } = require("../socket/socketHandler");

const sameId = (a, b) => String(a) === String(b);

const clearChat = async (req, res) => {
  try {
    const { receiverId } = req.params;
    const senderId = req.user._id;

    const senderObjId = new Types.ObjectId(senderId);
    const receiverObjId = new Types.ObjectId(receiverId);

    const conversation = await Conversation.findOne({
      participants: { $all: [senderObjId, receiverObjId] },
      isGroup: false,
    });

    if (!conversation) {
      return res.status(200).json({ success: true, message: "No conversation found" });
    }

    const messagesToDelete = await Message.find({
      conversationId: conversation._id,
      deletedBy: { $ne: senderObjId },
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
    return res
      .status(200)
      .json({ success: false, message: "Failed to clear chat", error: error.message });
  }
};

const getMessages = async (req, res) => {
  try {
    const { receiverId } = req.params;
    const senderId = req.user._id;

    const conversation = await Conversation.findOne({
      participants: { $all: [senderId, receiverId] },
      isGroup: false,
    });

    if (!conversation) return res.status(200).json({ data: [] });

    // Exclude messages that this user has deleted
    const messages = await Message.find({
      conversationId: conversation._id,
      deletedBy: { $ne: senderId }, // This filters out deleted messages
      isGroup: false,
    })
      .populate("senderId", "fullname username profilepic")
      .populate("replyTo.senderId", "fullname username")
      .populate("forwardedFrom", "fullname username")
      .sort({ createdAt: 1 });

    res.status(200).json({ data: messages });
  } catch (error) {
    console.log("getMessages error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const sendMessage = async (req, res) => {
  try {
    const { message, replyTo } = req.body;
    const { receiverId } = req.params;
    const senderId = req.user._id;

    // Block checks
    const [sender, receiver] = await Promise.all([
      User.findById(senderId).select("blockedUsers"),
      User.findById(receiverId).select("blockedUsers"),
    ]);
    if (!sender || !receiver) {
      return res.status(400).json({ success: false, message: "Invalid users" });
    }
    const isBlocked =
      (sender.blockedUsers || []).some(id => sameId(id, receiver._id)) ||
      (receiver.blockedUsers || []).some(id => sameId(id, sender._id));
    if (isBlocked) {
      return res.status(403).json({ success: false, message: "You cannot send messages to this user." });
    }

    let conversation = await Conversation.findOne({
      participants: { $all: [senderId, receiverId] },
      isGroup: false,
    });

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [senderId, receiverId],
        isGroup: false,
      });
    }

    let status = "sent";
    if (onlineUsers.has(String(receiverId))) status = "delivered";

    // Handle reply data
    let replyData = null;
    if (replyTo) {
      const originalMsg = await Message.findById(replyTo).populate("senderId", "fullname username");
      if (originalMsg) {
        replyData = {
          _id: originalMsg._id,
          message: originalMsg.message || "",
          media: originalMsg.media || "",
          mediaType: originalMsg.mediaType || "",
          senderId: originalMsg.senderId
        };
      }
    }

    const newMessage = new Message({
      senderId,
      receiverId,
      isGroup: false,
      message,
      conversationId: conversation._id,
      status,
      replyTo: replyData,
    });

    conversation.messages.push(newMessage._id);
    conversation.updatedAt = new Date();

    await Promise.all([
      conversation.save(),
      newMessage.save(),
      User.findByIdAndUpdate(senderId, { lastMessage: message.substring(0, 50), lastMessageTime: new Date() }),
      User.findByIdAndUpdate(receiverId, { lastMessage: message.substring(0, 50), lastMessageTime: new Date() }),
    ]);

    await newMessage.populate("senderId", "fullname username profilepic");
    if (newMessage.replyTo) {
      await newMessage.populate("replyTo.senderId", "fullname username");
    }

    const io = req.app.get("io");
    if (io) {
      // Emit to both sender and receiver
      io.to(String(senderId)).emit("new-message", newMessage);
      io.to(String(receiverId)).emit("new-message", newMessage);
    }

    res.status(201).json({ success: true, data: newMessage });
  } catch (error) {
    console.log("sendMessage error:", error);
    res.status(500).json({ success: false, message: "Message send failed" });
  }
};

// This would be the proper server-side implementation in messageRouteController.js
const deleteMessagesForMe = async (req, res) => {
  try {
    const { messageIds } = req.body;
    const userId = req.user._id;

    if (!Array.isArray(messageIds) || messageIds.length === 0) {
      return res.status(400).json({ success: false, message: "No message ids provided" });
    }

    // Update messages to add the current user to deletedBy array
    await Message.updateMany(
      { _id: { $in: messageIds }, deletedBy: { $ne: userId } },
      { $push: { deletedBy: userId } }
    );

    res.status(200).json({ success: true, message: "Messages deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to delete messages" });
  }
};

// Update the server-side handler for delete for everyone
const deleteMessagesForEveryone = async (req, res) => {
  try {
    const { messageIds } = req.body;
    const userId = req.user._id;
    
    if (!Array.isArray(messageIds) || messageIds.length === 0) {
      return res.status(400).json({ success: false, message: "No message ids provided" });
    }
    
    const messages = await Message.find({ _id: { $in: messageIds } });
    
    // Check if the user is allowed to delete all messages (must be the sender)
    const allowed = messages.every((msg) => sameId(msg.senderId, userId));
    if (!allowed) {
      return res.status(403).json({ success: false, message: "You can only delete messages you've sent" });
    }

    // Actually delete the messages for everyone
    await Message.updateMany(
      { _id: { $in: messageIds } },
      { $set: { isDeletedForEveryone: true } }
    );
    
    // Empty deletedBy array to ensure message is hidden for no one
    await Message.updateMany({ _id: { $in: messageIds } }, { $set: { deletedBy: [] } });

    const io = req.app.get("io");
    for (const msg of messages) {
      // Notify all participants about the deletion
      if (msg.isGroup) {
        const conv = await Conversation.findById(msg.conversationId).select("participants");
        conv?.participants?.forEach((uid) => {
          io.to(String(uid)).emit("message-deleted-everyone", { messageId: msg._id });
        });
      } else {
        io.to(String(msg.senderId)).emit("message-deleted-everyone", { messageId: msg._id });
        if (msg.receiverId) {
          io.to(String(msg.receiverId)).emit("message-deleted-everyone", { messageId: msg._id });
        }
      }
    }

    res.status(200).json({ success: true, message: "Messages deleted for everyone" });
  } catch (err) {
    console.error("Delete for everyone error:", err);
    res.status(500).json({ success: false, message: "Failed to delete messages for everyone" });
  }
};

const forwardMessages = async (req, res) => {
  try {
    const { messageIds, receiverIds } = req.body;
    const senderId = req.user._id;

    if (!Array.isArray(messageIds) || messageIds.length === 0) {
      return res.status(400).json({ success: false, message: "No message IDs provided" });
    }

    if (!Array.isArray(receiverIds) || receiverIds.length === 0) {
      return res.status(400).json({ success: false, message: "No receiver IDs provided" });
    }

    const originalMessages = await Message.find({ _id: { $in: messageIds } })
      .populate("senderId", "fullname username");

    const io = req.app.get("io");

    for (const originalMsg of originalMessages) {
      for (const receiverId of receiverIds) {
        // Find or create conversation
        let conversation = await Conversation.findOne({
          participants: { $all: [senderId, receiverId] },
          isGroup: false,
        });

        if (!conversation) {
          conversation = await Conversation.create({
            participants: [senderId, receiverId],
            isGroup: false,
          });
        }

        let status = "sent";
        if (onlineUsers.has(String(receiverId))) status = "delivered";

        // Create forwarded message
        const forwardedMessage = new Message({
          senderId,
          receiverId,
          isGroup: false,
          message: originalMsg.message || "",
          media: originalMsg.media || "",
          mediaType: originalMsg.mediaType || "",
          mediaSize: originalMsg.mediaSize || 0,
          mediaName: originalMsg.mediaName || "",
          mediaMime: originalMsg.mediaMime || "",
          conversationId: conversation._id,
          status,
          isForwarded: true,
          forwardedFrom: originalMsg.senderId,
        });

        conversation.messages.push(forwardedMessage._id);
        conversation.updatedAt = new Date();

        await Promise.all([
          conversation.save(),
          forwardedMessage.save(),
        ]);

        await forwardedMessage.populate("senderId", "fullname username profilepic");
        await forwardedMessage.populate("forwardedFrom", "fullname username");

        // Emit to both sender and receiver
        io.to(String(senderId)).emit("new-message", forwardedMessage);
        io.to(String(receiverId)).emit("new-message", forwardedMessage);
      }
    }

    res.status(200).json({ success: true, message: "Messages forwarded successfully" });
  } catch (error) {
    console.error("forwardMessages error:", error);
    res.status(500).json({ success: false, message: "Failed to forward messages" });
  }
};

// Star/Unstar messages
const starMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user._id;

    await Message.updateOne(
      { _id: messageId },
      { $addToSet: { starredBy: userId } }
    );

    res.status(200).json({ success: true, message: "Message starred" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to star message" });
  }
};

const unstarMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user._id;

    await Message.updateOne(
      { _id: messageId },
      { $pull: { starredBy: userId } }
    );

    res.status(200).json({ success: true, message: "Message unstarred" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to unstar message" });
  }
};

const getStarredMessages = async (req, res) => {
  try {
    const userId = req.user._id;

    const starredMessages = await Message.find({
      starredBy: userId,
      deletedBy: { $ne: userId },
      isDeletedForEveryone: false
    })
      .populate("senderId", "fullname username profilepic")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: starredMessages });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to get starred messages" });
  }
};

const sendMediaMessage = async (req, res) => {
  try {
    const { receiverId } = req.params;
    const { replyTo } = req.body;
    const senderId = req.user._id;

    let conversation = await Conversation.findOne({
      participants: { $all: [senderId, receiverId] },
      isGroup: false,
    });
    if (!conversation) {
      conversation = await Conversation.create({
        participants: [senderId, receiverId],
        isGroup: false,
      });
    }

    const mediaUrl = req.file ? `/uploads/${req.file.filename}` : "";
    const mediaSize = req.file ? req.file.size : 0;
    const mediaName = req.file ? req.file.originalname : "";
    const mediaMime = req.file ? req.file.mimetype : "";
    const mediaType = mediaMime.startsWith("image/")
      ? "image"
      : mediaMime.startsWith("video/")
        ? "video"
        : mediaMime.startsWith("audio/")
          ? "audio"
          : mediaUrl
            ? "document"
            : "";

    let status = "sent";
    if (onlineUsers.has(String(receiverId))) status = "delivered";

    // Handle reply data
    let replyData = null;
    if (replyTo) {
      const originalMsg = await Message.findById(replyTo).populate("senderId", "fullname username");
      if (originalMsg) {
        replyData = {
          _id: originalMsg._id,
          message: originalMsg.message || "",
          media: originalMsg.media || "",
          mediaType: originalMsg.mediaType || "",
          senderId: originalMsg.senderId
        };
      }
    }

    const newMessage = new Message({
      senderId,
      receiverId,
      isGroup: false,
      message: req.body.message || "",
      media: mediaUrl,
      mediaSize,
      mediaName,
      mediaMime,
      mediaType,
      conversationId: conversation._id,
      status,
      replyTo: replyData,
    });

    conversation.messages.push(newMessage._id);
    conversation.updatedAt = new Date();

    const lastMsg = req.body.message || (mediaType ? `📎 ${mediaType}` : "📎 Media");
    await Promise.all([
      conversation.save(),
      newMessage.save(),
      User.findByIdAndUpdate(senderId, { lastMessage: lastMsg.substring(0, 50), lastMessageTime: new Date() }),
      User.findByIdAndUpdate(receiverId, { lastMessage: lastMsg.substring(0, 50), lastMessageTime: new Date() }),
    ]);

    await newMessage.populate("senderId", "fullname username profilepic");
    if (newMessage.replyTo) {
      await newMessage.populate("replyTo.senderId", "fullname username");
    }

    const io = req.app.get("io");
    if (io) {
      io.to(String(senderId)).emit("new-message", newMessage);
      io.to(String(receiverId)).emit("new-message", newMessage);
    }

    res.status(201).json({ success: true, data: newMessage });
  } catch (error) {
    console.log("sendMediaMessage error:", error);
    res.status(500).json({ success: false, message: "Failed to send media" });
  }
};

/* --------- GROUP messaging --------- */

const getGroupMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user._id;

    const conv = await Conversation.findById(conversationId);
    if (!conv || !conv.isGroup) return res.status(404).json({ success: false, message: "Group not found" });
    if (!conv.participants.map(String).includes(String(userId))) {
      return res.status(403).json({ success: false, message: "Not a group member" });
    }

    const messages = await Message.find({
      conversationId,
      isGroup: true,
      deletedBy: { $ne: userId },
    })
      .populate("senderId", "fullname username profilepic")
      .populate("replyTo.senderId", "fullname username")
      .populate("forwardedFrom", "fullname username")
      .sort({ createdAt: 1 });

    res.status(200).json({ success: true, data: messages });
  } catch (e) {
    console.error("getGroupMessages error:", e);
    res.status(500).json({ success: false, message: "Failed to load group messages" });
  }
};

const sendGroupMessage = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { message, replyTo } = req.body;
    const senderId = req.user._id;

    const conv = await Conversation.findById(conversationId);
    if (!conv || !conv.isGroup) return res.status(404).json({ success: false, message: "Group not found" });

    if (!conv.participants.map(String).includes(String(senderId))) {
      return res.status(403).json({ success: false, message: "Not a group member" });
    }

    // Handle reply data
    let replyData = null;
    if (replyTo) {
      const originalMsg = await Message.findById(replyTo).populate("senderId", "fullname username");
      if (originalMsg) {
        replyData = {
          _id: originalMsg._id,
          message: originalMsg.message || "",
          media: originalMsg.media || "",
          mediaType: originalMsg.mediaType || "",
          senderId: originalMsg.senderId
        };
      }
    }

    const newMessage = new Message({
      senderId,
      isGroup: true,
      message: message || "",
      conversationId: conv._id,
      status: "sent",
      replyTo: replyData,
    });

    conv.messages.push(newMessage._id);
    conv.updatedAt = new Date();
    await Promise.all([conv.save(), newMessage.save()]);

    await newMessage.populate("senderId", "fullname username profilepic");
    if (newMessage.replyTo) {
      await newMessage.populate("replyTo.senderId", "fullname username");
    }

    const io = req.app.get("io");
    if (io) {
      conv.participants.forEach((uid) => {
        io.to(String(uid)).emit("new-message", newMessage);
      });
    }

    res.status(201).json({ success: true, data: newMessage });
  } catch (e) {
    console.error("sendGroupMessage error:", e);
    res.status(500).json({ success: false, message: "Failed to send message" });
  }
};

const sendGroupMediaMessage = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { replyTo } = req.body;
    const senderId = req.user._id;

    const conv = await Conversation.findById(conversationId);
    if (!conv || !conv.isGroup) return res.status(404).json({ success: false, message: "Group not found" });
    if (!conv.participants.map(String).includes(String(senderId))) {
      return res.status(403).json({ success: false, message: "Not a group member" });
    }

    const mediaUrl = req.file ? `/uploads/${req.file.filename}` : "";
    const mediaSize = req.file ? req.file.size : 0;
    const mediaName = req.file ? req.file.originalname : "";
    const mediaMime = req.file ? req.file.mimetype : "";
    const mediaType = mediaMime.startsWith("image/")
      ? "image"
      : mediaMime.startsWith("video/")
        ? "video"
        : mediaMime.startsWith("audio/")
          ? "audio"
          : mediaUrl
            ? "document"
            : "";

    // Handle reply data
    let replyData = null;
    if (replyTo) {
      const originalMsg = await Message.findById(replyTo).populate("senderId", "fullname username");
      if (originalMsg) {
        replyData = {
          _id: originalMsg._id,
          message: originalMsg.message || "",
          media: originalMsg.media || "",
          mediaType: originalMsg.mediaType || "",
          senderId: originalMsg.senderId
        };
      }
    }

    const newMessage = new Message({
      senderId,
      isGroup: true,
      message: req.body.message || "",
      media: mediaUrl,
      mediaSize,
      mediaName,
      mediaMime,
      mediaType,
      conversationId: conv._id,
      status: "sent",
      replyTo: replyData,
    });

    conv.messages.push(newMessage._id);
    conv.updatedAt = new Date();
    await Promise.all([conv.save(), newMessage.save()]);

    await newMessage.populate("senderId", "fullname username profilepic");
    if (newMessage.replyTo) {
      await newMessage.populate("replyTo.senderId", "fullname username");
    }

    const io = req.app.get("io");
    if (io) {
      conv.participants.forEach((uid) => {
        io.to(String(uid)).emit("new-message", newMessage);
      });
    }

    res.status(201).json({ success: true, data: newMessage });
  } catch (e) {
    console.error("sendGroupMediaMessage error:", e);
    res.status(500).json({ success: false, message: "Failed to send media" });
  }
};

const markDelivered = async (req, res) => {
  try {
    const userId = req.user._id;
    const { messageId } = req.params;

    const msg = await Message.findById(messageId);
    if (!msg) return res.status(404).json({ success: false, message: "Message not found" });

    const conv = await Conversation.findById(msg.conversationId);
    if (!conv) return res.status(404).json({ success: false, message: "Conversation not found" });

    if (!conv.participants.some(p => sameId(p, userId))) {
      return res.status(403).json({ success: false, message: "Not a participant" });
    }

    if (!sameId(msg.senderId, userId)) {
      await Message.updateOne({ _id: messageId }, { $addToSet: { deliveredTo: userId } });
    }

    res.status(200).json({ success: true });
  } catch (e) {
    console.error("markDelivered error:", e);
    res.status(500).json({ success: false, message: "Failed to mark delivered" });
  }
};

const markSeen = async (req, res) => {
  try {
    const userId = req.user._id;
    const { messageId } = req.params;

    const msg = await Message.findById(messageId);
    if (!msg) return res.status(404).json({ success: false, message: "Message not found" });

    const conv = await Conversation.findById(msg.conversationId);
    if (!conv) return res.status(404).json({ success: false, message: "Conversation not found" });

    if (!conv.participants.some(p => sameId(p, userId))) {
      return res.status(403).json({ success: false, message: "Not a participant" });
    }

    if (!sameId(msg.senderId, userId)) {
      await Message.updateOne(
        { _id: messageId },
        { $addToSet: { seenBy: userId }, $pull: { deliveredTo: userId } }
      );
    }

    res.status(200).json({ success: true });
  } catch (e) {
    console.error("markSeen error:", e);
    res.status(500).json({ success: false, message: "Failed to mark seen" });
  }
};

const getMessageReceipts = async (req, res) => {
  try {
    const userId = req.user._id;
    const { messageId } = req.params;

    const msg = await Message.findById(messageId).populate("senderId", "fullname username profilepic");
    if (!msg) return res.status(404).json({ success: false, message: "Message not found" });

    const conv = await Conversation.findById(msg.conversationId);
    if (!conv) return res.status(404).json({ success: false, message: "Conversation not found" });

    if (!conv.participants.some(p => sameId(p, userId))) {
      return res.status(403).json({ success: false, message: "Not a participant" });
    }

    const participants = await User.find({ _id: { $in: conv.participants } })
      .select("_id fullname username profilepic");

    const seenIds = new Set((msg.seenBy || []).map(String));
    const deliveredIds = new Set((msg.deliveredTo || []).map(String));
    const senderId = String(msg.senderId._id);

    const seen = [];
    const delivered = [];
    const pending = [];

    for (const p of participants) {
      const id = String(p._id);
      if (id === senderId) continue; // exclude sender from the list
      if (seenIds.has(id)) seen.push(p);
      else if (deliveredIds.has(id)) delivered.push(p);
      else pending.push(p);
    }

    res.status(200).json({ success: true, data: { seen, delivered, pending } });
  } catch (e) {
    console.error("getMessageReceipts error:", e);
    res.status(500).json({ success: false, message: "Failed to load receipts" });
  }
};

module.exports = {
  // 1:1
  sendMessage,
  getMessages,
  clearChat,
  deleteMessagesForMe,
  deleteMessagesForEveryone,
  sendMediaMessage,
  forwardMessages,
  // groups
  getGroupMessages,
  sendGroupMessage,
  sendGroupMediaMessage,
  // receipts
  markDelivered,
  markSeen,
  getMessageReceipts,
  // starred
  starMessage,
  unstarMessage,
  getStarredMessages,

};