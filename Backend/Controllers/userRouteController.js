const bcryptjs = require("bcryptjs");
const User = require("../Models/userModel");
const jwtToken = require("../utils/jwtWebToken");
const { generateVerificationCode, sendVerificationEmail } = require("../utils/emailService");

// Check email status and determine the flow
const checkEmailStatus = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ success: false, msg: "Email is required" });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ success: false, msg: "Invalid email format" });
        }

        const normalizedEmail = email.toLowerCase().trim();
        console.log(`🔍 Checking email status for: ${normalizedEmail}`);

        // Check if user exists with verified email and complete registration
        const existingUser = await User.findOne({
            email: normalizedEmail,
            isEmailVerified: true,
            isRegistrationComplete: true
        });

        if (existingUser) {
            console.log(`✅ User exists and is verified: ${normalizedEmail}`);
            return res.status(200).json({
                success: true,
                userExists: true,
                needsPassword: true,
                msg: "Enter your password to continue",
                userId: existingUser._id
            });
        }

        console.log(`📧 New user, need to send verification: ${normalizedEmail}`);

        // Generate verification code for new user
        const code = generateVerificationCode();
        const expirationTime = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        // Try to send email FIRST
        const emailSent = await sendVerificationEmail(normalizedEmail, code);

        if (!emailSent) {
            console.error(`❌ Failed to send email to ${normalizedEmail}`);
            return res.status(500).json({
                success: false,
                msg: "Failed to send verification email. Please try again."
            });
        }

        console.log(`✅ Verification email sent to ${normalizedEmail}`);

        // Save to database after email is sent successfully
        let user = await User.findOne({ email: normalizedEmail });

        if (user) {
            // Update existing unverified user
            user.emailVerificationCode = code;
            user.emailVerificationExpires = expirationTime;
            user.isEmailVerified = false;
            user.isRegistrationComplete = false;
            await user.save({ validateBeforeSave: false });
        } else {
            // Create new user entry
            user = new User({
                email: normalizedEmail,
                emailVerificationCode: code,
                emailVerificationExpires: expirationTime,
                isEmailVerified: false,
                isRegistrationComplete: false
            });
            await user.save({ validateBeforeSave: false });
        }

        res.status(200).json({
            success: true,
            userExists: false,
            needsVerification: true,
            msg: "Verification code sent to your email",
            userId: user._id
        });

    } catch (error) {
        console.error("checkEmailStatus error:", error);
        res.status(500).json({
            success: false,
            msg: "Server error. Please try again."
        });
    }
};

// NEW: Verify OTP only (separate from registration)
const verifyOtp = async (req, res) => {
    try {
        const { userId, code } = req.body;

        console.log(`🔍 Verifying OTP for user: ${userId}`);

        // Validate required fields
        if (!userId || !code) {
            return res.status(400).json({
                success: false,
                msg: "User ID and verification code are required"
            });
        }

        const user = await User.findById(userId);

        if (!user) {
            return res.status(400).json({ success: false, msg: "User not found" });
        }

        // Verify the code
        if (!user.emailVerificationCode || user.emailVerificationCode !== code) {
            return res.status(400).json({ success: false, msg: "Invalid verification code" });
        }

        if (!user.emailVerificationExpires || user.emailVerificationExpires < new Date()) {
            return res.status(400).json({ success: false, msg: "Verification code has expired" });
        }

        console.log(`✅ OTP verified successfully for: ${user.email}`);

        // OTP is valid - return success but don't complete registration yet
        res.status(200).json({
            success: true,
            msg: "Verification code is valid",
            userId: user._id
        });

    } catch (error) {
        console.error("verifyOtp error:", error);
        res.status(500).json({ success: false, msg: "Server error" });
    }
};

// Verify email code and complete registration
const verifyAndRegister = async (req, res) => {
    try {
        const { userId, code, fullname, username, gender, password } = req.body;

        console.log(`🔍 Completing registration for user: ${userId}`);

        // Validate required fields
        if (!userId || !code || !fullname || !username || !password) {
            return res.status(400).json({
                success: false,
                msg: "All fields are required"
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                msg: "Password must be at least 6 characters long"
            });
        }

        const user = await User.findById(userId);

        if (!user) {
            return res.status(400).json({ success: false, msg: "User not found" });
        }

        // Verify the code again (double check)
        if (!user.emailVerificationCode || user.emailVerificationCode !== code) {
            return res.status(400).json({ success: false, msg: "Invalid verification code" });
        }

        if (!user.emailVerificationExpires || user.emailVerificationExpires < new Date()) {
            return res.status(400).json({ success: false, msg: "Verification code has expired" });
        }

        const normalizedUsername = username.toLowerCase().trim();

        // Check if username already exists
        const existingUsername = await User.findOne({
            username: normalizedUsername,
            _id: { $ne: userId },
            isRegistrationComplete: true
        });

        if (existingUsername) {
            return res.status(400).json({ success: false, msg: "Username already exists" });
        }

        // Complete registration
        user.fullname = fullname.trim();
        user.username = normalizedUsername;
        user.gender = gender || "male";
        user.password = password; // Will be hashed by pre-save middleware
        user.isEmailVerified = true;
        user.isRegistrationComplete = true;
        user.isOnline = true;
        user.lastSeen = new Date();
        user.emailVerificationCode = "";
        user.emailVerificationExpires = null;
        user.about = "Hey there! I am using ChatCore.";

        await user.save();

        console.log(`✅ Registration completed for: ${user.email}`);

        // Generate JWT token
        jwtToken(user._id, res);

        res.status(200).json({
            success: true,
            msg: "Registration completed successfully",
            user: {
                _id: user._id,
                fullname: user.fullname,
                username: user.username,
                email: user.email,
                gender: user.gender,
                profilepic: user.profilepic,
                about: user.about,
                isOnline: user.isOnline
            }
        });

    } catch (error) {
        console.error("verifyAndRegister error:", error);

        if (error.code === 11000) {
            return res.status(400).json({ success: false, msg: "Username already exists" });
        }

        if (error.name === 'ValidationError') {
            const firstError = Object.values(error.errors)[0];
            return res.status(400).json({ success: false, msg: firstError.message });
        }

        res.status(500).json({ success: false, msg: "Server error" });
    }
};

// Login with password
const loginWithPassword = async (req, res) => {
    try {
        const { userId, password } = req.body;

        if (!userId || !password) {
            return res.status(400).json({ success: false, msg: "User ID and password are required" });
        }

        console.log(`🔐 Login attempt for user ID: ${userId}`);

        const user = await User.findById(userId);
        console.log(user)
        if (!user) {
            return res.status(400).json({ success: false, msg: "User not found" });
        }

        if (!user.isEmailVerified || !user.isRegistrationComplete) {
            return res.status(400).json({ success: false, msg: "Account not properly set up" });
        }

        // Verify password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            console.log(`❌ Invalid password for user: ${user.email}`);
            return res.status(401).json({ success: false, msg: "Incorrect password" });
        }

        // Update online status
        user.isOnline = true;
        user.lastSeen = new Date();
        await user.save({ validateBeforeSave: false });

        console.log(`✅ Login successful for: ${user.email}`);

        // Generate JWT token
        jwtToken(user._id, res);

        res.status(200).json({
            success: true,
            msg: "Login successful",
            user: {
                _id: user._id,
                fullname: user.fullname,
                username: user.username,
                email: user.email,
                gender: user.gender,
                profilepic: user.profilepic,
                about: user.about,
                isOnline: user.isOnline,
                lastSeen: user.lastSeen
            }
        });

    } catch (error) {
        console.error("loginWithPassword error:", error);
        res.status(500).json({ success: false, msg: "Server error" });
    }
};


// Logout function
const logOut = async (req, res) => {
    try {
        if (req.user && req.user._id) {
            await User.findByIdAndUpdate(req.user._id, {
                isOnline: false,
                lastSeen: new Date()
            });
            console.log(`👋 User logged out: ${req.user._id}`);
        }

        res.cookie("jwt", "", { maxAge: 0 });
        res.status(200).json({ success: true, message: "Logout successful" });
    } catch (error) {
        console.error("logOut error:", error);
        res.status(500).json({ success: false, msg: "Server error" });
    }
};

// Cleanup function
const cleanupUnverifiedUsers = async () => {
    try {
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

        const result = await User.deleteMany({
            isEmailVerified: false,
            createdAt: { $lt: oneDayAgo }
        });

        if (result.deletedCount > 0) {
            console.log(`🧹 Cleaned up ${result.deletedCount} unverified users`);
        }
    } catch (error) {
        console.error('Cleanup error:', error);
    }
};

// Run cleanup every hour
setInterval(cleanupUnverifiedUsers, 60 * 60 * 1000);
const getCurrentUser = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('-password -emailVerificationCode');

        if (!user) {
            return res.status(404).json({ success: false, msg: "User not found" });
        }

        // Update last seen
        user.isOnline = true;
        user.lastSeen = new Date();
        await user.save({ validateBeforeSave: false });

        res.status(200).json({
            success: true,
            user: {
                _id: user._id,
                fullname: user.fullname,
                username: user.username,
                email: user.email,
                gender: user.gender,
                profilepic: user.profilepic,
                about: user.about,
                isOnline: user.isOnline,
                lastSeen: user.lastSeen
            }
        });

    } catch (error) {
        console.error("getCurrentUser error:", error);
        res.status(500).json({ success: false, msg: "Server error" });
    }
};


// Update profile (profile picture upload and status/about)
const updateProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ success: false, msg: "User not found" });

        const { about, profilepicUrl } = req.body;
        if (typeof about === 'string') user.about = about.slice(0, 150);
        if (req.file) {
            user.profilepic = `/uploads/${req.file.filename}`;
        } else if (typeof profilepicUrl === 'string' && profilepicUrl.trim()) {
            user.profilepic = profilepicUrl.trim();
        }

        await user.save({ validateBeforeSave: false });

        res.status(200).json({
            success: true,
            user: {
                _id: user._id,
                fullname: user.fullname,
                username: user.username,
                email: user.email,
                gender: user.gender,
                profilepic: user.profilepic,
                about: user.about,
                isOnline: user.isOnline,
                lastSeen: user.lastSeen
            }
        });
    } catch (e) {
        console.error("updateProfile error:", e);
        res.status(500).json({ success: false, msg: "Failed to update profile" });
    }
};

// Helper to compare ObjectIds safely
const oidEq = (a, b) => String(a) === String(b);

// Block / Unblock user (fix: robust equality + id casting)
const blockUser = async (req, res) => {
    try {
        const me = req.user._id;
        const { otherUserId } = req.params;
        await User.updateOne({ _id: me }, { $addToSet: { blockedUsers: otherUserId } });
        res.status(200).json({ success: true, message: "User blocked" });
    } catch (e) {
        res.status(500).json({ success: false, message: "Failed to block user" });
    }
};

const unblockUser = async (req, res) => {
    try {
        const me = req.user._id;
        const { otherUserId } = req.params;
        await User.updateOne({ _id: me }, { $pull: { blockedUsers: otherUserId } });
        res.status(200).json({ success: true, message: "User unblocked" });
    } catch (e) {
        res.status(500).json({ success: false, message: "Failed to unblock user" });
    }
};

// List my blocked users
const listBlocked = async (req, res) => {
    try {
        const me = await User.findById(req.user._id).select("blockedUsers");
        const users = await User.find({ _id: { $in: me.blockedUsers || [] } })
            .select("_id fullname username profilepic");
        res.status(200).json({ success: true, data: users });
    } catch (e) {
        res.status(500).json({ success: false, message: "Failed to load blocked users" });
    }
};

module.exports = {
    checkEmailStatus,
    verifyOtp,
    verifyAndRegister,
    loginWithPassword,
    getCurrentUser,
    logOut,
    cleanupUnverifiedUsers,
    updateProfile,
    blockUser,
    unblockUser,
    listBlocked
};