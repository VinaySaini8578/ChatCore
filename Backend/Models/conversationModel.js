const mongoose = require("mongoose");

const conversationSchema = new mongoose.Schema(
  {
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    messages: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Message",
        default: [],
      },
    ],
    // Group support
    isGroup: { type: Boolean, default: false },
    name: { type: String, default: "" },
    admins: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", default: [] }],
    groupAvatar: { type: String, default: "" },
    // Archive
    archivedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", default: [] }],
  },
  { timestamps: true }
);

const Conversation = mongoose.model("Conversation", conversationSchema);
module.exports = Conversation;