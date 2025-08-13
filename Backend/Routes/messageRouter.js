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
  sendMediaMessage
} = require("../Controllers/messageRouteController");
const isLoggedIn = require("../MiddleWares/isLoggedIn");

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "uploads/"); // <-- CORRECTED: no ../
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

Router.post("/send/:receiverId", isLoggedIn, sendMessage);
Router.get("/:receiverId", isLoggedIn, getMessages);
Router.delete("/clear/:receiverId", isLoggedIn, clearChat);
Router.post("/delete/me", isLoggedIn, deleteMessagesForMe);
Router.post("/delete/everyone", isLoggedIn, deleteMessagesForEveryone);
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
module.exports = Router;