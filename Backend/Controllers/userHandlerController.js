const User = require("../Models/userModel.js");
const Conversation = require("../Models/conversationModel.js");
const Message = require("../Models/messageModel.js");

// Search users (exclude me, verified only)
const getUserBySearch = async (req, res) => {
  try {
    const q = (req.query.q ?? req.query.search ?? "").trim();
    const currentUserID = req.user._id;

    const match = {
      _id: { $ne: currentUserID },
      isEmailVerified: true,
    };

    if (q) {
      match.$or = [
        { username: { $regex: q, $options: "i" } },
        { fullname: { $regex: q, $options: "i" } },
      ];
    }

    const users = await User.find(match)
      .select("-password -emailVerificationCode")
      .sort({ fullname: 1 });

    res.status(200).json({ data: users });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Sidebar list: return both 1:1 and groups (excluding archived by me)
// FIX: compute lastMessage by looking up only non-deleted, non-removed messages sorted by createdAt
const getCurrentChatters = async (req, res) => {
  try {
    const currentUserID = req.user._id;

    const conversations = await Conversation.aggregate([
      {
        $match: {
          participants: { $in: [currentUserID] },
          archivedBy: { $nin: [currentUserID] }
        }
      },
      // Lookup only the messages we care about (not deleted-for-me and not deleted-for-everyone),
      // sorted by createdAt so we can pick the true last message.
      {
        $lookup: {
          from: "messages",
          let: { msgIds: "$messages", me: currentUserID },
          pipeline: [
            { $match: { $expr: { $in: ["$_id", "$$msgIds"] } } },
            { $match: { $expr: { $not: { $in: ["$$me", "$deletedBy"] } } } },
            { $match: { isDeletedForEveryone: { $ne: true } } },
            { $sort: { createdAt: 1 } }
          ],
          as: "messageDetails"
        }
      },
      {
        $addFields: {
          lastMessage: { $arrayElemAt: ["$messageDetails", -1] }
        }
      },
      { $sort: { updatedAt: -1 } },
      {
        $project: {
          participants: 1,
          isGroup: 1,
          name: 1,
          groupAvatar: 1,
          updatedAt: 1,
          lastMessage: 1
        }
      }
    ]);

    if (!conversations.length) {
      return res.status(200).json({ data: [] });
    }

    const items = [];

    for (const conv of conversations) {
      if (conv.isGroup) {
        items.push({
          isGroup: true,
          _id: conv._id,
          name: conv.name,
          groupAvatar: conv.groupAvatar,
          participants: conv.participants,
          // prefer lastMessage text if present, else media badge, else empty
          lastMessage: conv.lastMessage
            ? (conv.lastMessage.message || (conv.lastMessage.media ? "📎 Media" : ""))
            : "",
          lastMessageTime: conv.lastMessage ? conv.lastMessage.createdAt : conv.updatedAt,
        });
      } else {
        const otherUserId = conv.participants.find(
          (id) => id.toString() !== currentUserID.toString()
        );
        const user = await User.findById(otherUserId).select(
          "-password -emailVerificationCode"
        );
        if (user) {
          items.push({
            isGroup: false,
            _id: user._id,
            fullname: user.fullname,
            username: user.username,
            profilepic: user.profilepic,
            lastMessage: conv.lastMessage
              ? (conv.lastMessage.message || (conv.lastMessage.media ? "📎 Media" : ""))
              : "",
            lastMessageTime: conv.lastMessage ? conv.lastMessage.createdAt : conv.updatedAt,
          });
        }
      }
    }

    res.status(200).json({ data: items });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getUserBySearch, getCurrentChatters };