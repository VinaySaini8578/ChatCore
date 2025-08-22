const express = require("express");
const { 
    checkEmailStatus,
    verifyOtp,
    verifyAndRegister,
    loginWithPassword,
    getCurrentUser,
    logOut
} = require("../Controllers/userRouteController.js");
const authMiddleware = require("../MiddleWares/isLoggedIn.js");

const router = express.Router();

// New smart authentication routes
router.post("/check-email", checkEmailStatus);
router.post("/verify-otp", verifyOtp);
router.post("/verify-and-register", verifyAndRegister);
router.post("/login-with-password", loginWithPassword);
router.get("/me", authMiddleware, getCurrentUser);
router.post("/logout", authMiddleware, logOut);

module.exports = router;