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
// For groups, also include participants so the UI can filter "already in group".
const getCurrentChatters = async (req, res) => {
  try {
    const currentUserID = req.user._id;

    const conversations = await Conversation.aggregate([
      { $match: { participants: { $in: [currentUserID] }, archivedBy: { $nin: [currentUserID] } } },
      {
        $lookup: {
          from: "messages",
          localField: "messages",
          foreignField: "_id",
          as: "messageDetails",
        },
      },
      {
        $addFields: {
          lastMessage: {
            $arrayElemAt: [
              {
                $filter: {
                  input: "$messageDetails",
                  cond: { $not: { $in: [currentUserID, "$$this.deletedBy"] } },
                },
              },
              -1,
            ],
          },
        },
      },
      { $sort: { updatedAt: -1 } },
      {
        $project: {
          participants: 1,
          isGroup: 1,
          name: 1,
          groupAvatar: 1,
          updatedAt: 1,
          lastMessage: 1,
        },
      },
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
          participants: conv.participants, // send to FE so it can filter "already in group"
          lastMessage: conv.lastMessage ? conv.lastMessage.message || "📎 Media" : "",
          lastMessageTime: conv.lastMessage ? conv.lastMessage.createdAt : conv.updatedAt,
        });
      } else {
        // 1:1 chat - find the other participant
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
            lastMessage: conv.lastMessage ? conv.lastMessage.message || "📎 Media" : "",
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