const Conversation = require("../Models/conversationModel");
const User = require("../Models/userModel");
const { Types } = require("mongoose");

// Create group
const createGroup = async (req, res) => {
  try {
    const creatorId = req.user._id;
    const members = (req.body["members[]"] || req.body.members || []);
    const normalized = Array.isArray(members) ? members : [members];
    const name = (req.body.name || "").trim();

    if (!name) return res.status(400).json({ success: false, message: "Group name is required" });
    if (normalized.length < 2) {
      return res.status(400).json({ success: false, message: "Select at least 2 members" });
    }

    const participants = Array.from(new Set([creatorId.toString(), ...normalized.map(String)]));

    const group = await Conversation.create({
      isGroup: true,
      name,
      participants: participants.map((id) => new Types.ObjectId(id)),
      admins: [creatorId],
      groupAvatar: req.file ? `/uploads/${req.file.filename}` : "",
    });

    return res.status(201).json({ success: true, data: group });
  } catch (e) {
    console.error("createGroup error:", e);
    res.status(500).json({ success: false, message: "Failed to create group" });
  }
};

// Update group (name, avatar) - admins only
const updateGroup = async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const { groupId } = req.params;
    const { name } = req.body;

    const group = await Conversation.findById(groupId);
    if (!group || !group.isGroup) return res.status(404).json({ success: false, message: "Group not found" });

    if (!group.admins.map((id) => id.toString()).includes(userId)) {
      return res.status(403).json({ success: false, message: "Only admins can update the group" });
    }

    if (typeof name === "string" && name.trim()) group.name = name.trim();
    if (req.file) group.groupAvatar = `/uploads/${req.file.filename}`;

    await group.save();
    res.status(200).json({ success: true, data: group });
  } catch (e) {
    console.error("updateGroup error:", e);
    res.status(500).json({ success: false, message: "Failed to update group" });
  }
};

// Add members (admins only)
const addMembers = async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const { groupId } = req.params;
    const members = (req.body.members || req.body["members[]"] || []);
    const toAdd = (Array.isArray(members) ? members : [members]).map(String);

    const group = await Conversation.findById(groupId);
    if (!group || !group.isGroup) return res.status(404).json({ success: false, message: "Group not found" });
    if (!group.admins.map(String).includes(userId)) {
      return res.status(403).json({ success: false, message: "Only admins can add members" });
    }

    toAdd.forEach((m) => {
      if (!group.participants.map(String).includes(m)) {
        group.participants.push(new Types.ObjectId(m));
      }
    });

    await group.save();
    res.status(200).json({ success: true, data: group });
  } catch (e) {
    console.error("addMembers error:", e);
    res.status(500).json({ success: false, message: "Failed to add members" });
  }
};

// List members (with user details)
const getGroupMembers = async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const { groupId } = req.params;
    const group = await Conversation.findById(groupId);
    if (!group || !group.isGroup) return res.status(404).json({ success: false, message: "Group not found" });
    if (!group.participants.map(String).includes(userId)) {
      return res.status(403).json({ success: false, message: "Not a group member" });
    }

    const users = await User.find({ _id: { $in: group.participants } })
      .select("_id fullname username profilepic");

    res.status(200).json({ success: true, data: users });
  } catch (e) {
    console.error("getGroupMembers error:", e);
    res.status(500).json({ success: false, message: "Failed to fetch members" });
  }
};

// Archive / Unarchive
const archiveConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user._id;
    await Conversation.updateOne({ _id: conversationId }, { $addToSet: { archivedBy: userId } });
    res.status(200).json({ success: true, message: "Chat archived" });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

const unarchiveConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user._id;
    await Conversation.updateOne({ _id: conversationId }, { $pull: { archivedBy: userId } });
    res.status(200).json({ success: true, message: "Chat unarchived" });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

const getArchivedConversations = async (req, res) => {
  try {
    const userId = req.user._id;
    const list = await Conversation.find({ archivedBy: userId })
      .sort({ updatedAt: -1 })
      .select("_id isGroup name participants groupAvatar updatedAt");
    res.status(200).json({ success: true, data: list });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

// Ensure/find 1:1 conversation
const ensureOneToOne = async (req, res) => {
  try {
    const me = req.user._id;
    const { otherUserId } = req.params;
    let conv = await Conversation.findOne({
      isGroup: false,
      participants: { $all: [me, otherUserId] },
    });
    if (!conv) {
      conv = await Conversation.create({
        isGroup: false,
        participants: [me, otherUserId],
      });
    }
    res.status(200).json({ success: true, data: { conversationId: conv._id } });
  } catch (e) {
    res.status(500).json({ success: false, message: "Failed to ensure chat" });
  }
};

module.exports = {
  createGroup,
  updateGroup,
  addMembers,
  getGroupMembers,
  archiveConversation,
  unarchiveConversation,
  getArchivedConversations,
  ensureOneToOne,
};