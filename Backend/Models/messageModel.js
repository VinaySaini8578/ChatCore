const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    // For 1:1 messages this is set; for group messages it may be undefined
    receiverId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false },
    isGroup: { type: Boolean, default: false },

    message: { type: String, required: false },
    media: { type: String, default: "" },
    mediaSize: { type: Number, default: 0 },
    mediaName: { type: String, default: "" },
    mediaMime: { type: String, default: "" },
    mediaType: {
      type: String,
      enum: ["", "image", "video", "audio", "document"],
      default: "",
    },

    conversationId: { type: mongoose.Schema.Types.ObjectId, ref: "Conversation" },

    status: {
      type: String,
      enum: ["sent", "delivered", "seen"],
      default: "sent",
    },

    // Deletions
    deletedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    isDeletedForEveryone: { type: Boolean, default: false },

    // Starred
    starredBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    // Read receipts (for 1:1 and group)
    deliveredTo: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // users who received
    seenBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],      // users who saw

    // Reply functionality
    replyTo: {
      _id: { type: mongoose.Schema.Types.ObjectId, ref: "Message" },
      message: { type: String, default: "" },
      media: { type: String, default: "" },
      mediaType: { type: String, default: "" },
      senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
    },

    // Forward functionality
    isForwarded: { type: Boolean, default: false },
    forwardedFrom: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

const Message = mongoose.model("Message", messageSchema);
module.exports = Message;