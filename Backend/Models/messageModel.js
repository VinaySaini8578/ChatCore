const mongoose = require("mongoose");
const messageSchema = new mongoose.Schema({
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    receiverId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    message: { type: String, required: false },
    media: { type: String, default: "" },
    mediaSize: { type: Number, default: 0 }, // <-- add this
    conversationId: { type: mongoose.Schema.Types.ObjectId, ref: "Conversation" },
    status: {
        type: String,
        enum: ["sent", "delivered", "seen"],
        default: "sent"
    },
    deletedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    isDeletedForEveryone: { type: Boolean, default: false },
}, { timestamps: true });

const Message = mongoose.model("Message", messageSchema);
module.exports = Message;