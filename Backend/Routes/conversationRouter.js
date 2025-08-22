const express = require("express");
const multer = require("multer");
const path = require("path");
const isLoggedIn = require("../MiddleWares/isLoggedIn");
const {
  createGroup,
  updateGroup,
  addMembers,
  getGroupMembers,
  archiveConversation,
  unarchiveConversation,
  getArchivedConversations,
  ensureOneToOne,
} = require("../Controllers/conversationController");

const Router = express.Router();

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

// Group create + update + add members + list members
Router.post("/group", isLoggedIn, upload.single("groupAvatar"), createGroup);
Router.post("/group/:groupId/update", isLoggedIn, upload.single("groupAvatar"), updateGroup);
Router.post("/group/:groupId/add-members", isLoggedIn, addMembers);
Router.get("/group/:groupId/members", isLoggedIn, getGroupMembers);

// Archive controls
Router.post("/:conversationId/archive", isLoggedIn, archiveConversation);
Router.post("/:conversationId/unarchive", isLoggedIn, unarchiveConversation);
Router.get("/archived/list", isLoggedIn, getArchivedConversations);

// Ensure/find 1:1 conversation
Router.get("/ensure/:otherUserId", isLoggedIn, ensureOneToOne);

module.exports = Router;