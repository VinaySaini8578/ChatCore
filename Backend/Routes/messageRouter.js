const express = require("express");
const Router = express.Router();
const multer = require('multer');
const path = require('path');
const {
  sendMessage,
  getMessages,
  clearChat,
  deleteMessagesForMe,
  deleteMessagesForEveryone,
  sendMediaMessage,
  forwardMessages,
  // group
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
} = require("../Controllers/messageRouteController");
const isLoggedIn = require("../MiddleWares/isLoggedIn");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

/* 1:1 */
Router.post("/send/:receiverId", isLoggedIn, sendMessage);
Router.get("/:receiverId", isLoggedIn, getMessages);
Router.delete("/clear/:receiverId", isLoggedIn, clearChat);
Router.post("/delete/me", isLoggedIn, deleteMessagesForMe);
Router.post("/delete/everyone", isLoggedIn, deleteMessagesForEveryone);
Router.post("/forward", isLoggedIn, forwardMessages);

Router.post("/send-media/:receiverId", isLoggedIn, (req, res, next) => {
  upload.single('media')(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ success: false, message: err.message });
    } else if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
    next();
  });
}, sendMediaMessage);

/* Group */
Router.get("/group/:conversationId", isLoggedIn, getGroupMessages);
Router.post("/group/:conversationId/send", isLoggedIn, sendGroupMessage);
Router.post("/group/:conversationId/send-media", isLoggedIn, (req, res, next) => {
  upload.single('media')(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ success: false, message: err.message });
    } else if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
    next();
  });
}, sendGroupMediaMessage);

/* Receipts */
Router.post("/:messageId/delivered", isLoggedIn, markDelivered);
Router.post("/:messageId/seen", isLoggedIn, markSeen);
Router.get("/:messageId/receipts", isLoggedIn, getMessageReceipts);

/* Starred messages */
Router.post("/star/:messageId", isLoggedIn, starMessage);
Router.post("/unstar/:messageId", isLoggedIn, unstarMessage);
Router.get("/starred/list", isLoggedIn, getStarredMessages);

module.exports = Router;