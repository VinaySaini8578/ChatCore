const express = require("express");
const Router = express.Router();
const isLoggedIn = require("../MiddleWares/isLoggedIn.js");
const { getUserBySearch, getCurrentChatters } = require("../Controllers/userHandlerController.js");
const { updateProfile, blockUser, unblockUser, listBlocked } = require("../Controllers/userRouteController.js");
const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

Router.get("/search", isLoggedIn, getUserBySearch);
Router.get("/getCurrentChatters", isLoggedIn, getCurrentChatters);

// Update profile (multipart)
Router.post("/update-profile", isLoggedIn, (req, res, next) => {
  upload.single("profilepic")(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ success: false, msg: err.message });
    } else if (err) {
      return res.status(400).json({ success: false, msg: err.message });
    }
    next();
  });
}, updateProfile);

// Block / Unblock + list
Router.post("/block/:otherUserId", isLoggedIn, blockUser);
Router.post("/unblock/:otherUserId", isLoggedIn, unblockUser);
Router.get("/blocked/list", isLoggedIn, listBlocked);


module.exports = Router;