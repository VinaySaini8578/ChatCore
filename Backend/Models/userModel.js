const mongoose = require("mongoose");
const bcrypt = require('bcryptjs');
const userSchema = new mongoose.Schema({
    fullname: {
        type: String,
        required: function() { 
            return this.isEmailVerified && this.isRegistrationComplete; 
        },
        trim: true
    },
    username: {
        type: String,
        required: function() { 
            return this.isEmailVerified && this.isRegistrationComplete; 
        },
        unique: true,
        sparse: true, // Allows multiple documents with undefined username
        trim: true,
        lowercase: true // Add this for consistency
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, "Please enter a valid email"]
    },
    gender: {
        type: String,
        required: function() { 
            return this.isEmailVerified && this.isRegistrationComplete; 
        },
        enum: ["male", "female"],
        default: "male"
    },
    password: {
        type: String,
        required: function() { 
            return this.isEmailVerified && this.isRegistrationComplete; 
        },
        minlength: [6, 'Password must be at least 6 characters long']
    },
    profilepic: {
        type: String,
        default: "",
    },
    about: {
        type: String,
        default: "Hey there! I am using ChatCore.",
        maxlength: [150, 'About section cannot exceed 150 characters']
    },
    // Email verification fields
    isEmailVerified: {
        type: Boolean,
        default: false,
    },
    isRegistrationComplete: {
        type: Boolean,
        default: false,
    },
    emailVerificationCode: {
        type: String,
        default: "",
    },
    emailVerificationExpires: {
        type: Date,
    },
    // Online status
    isOnline: {
        type: Boolean,
        default: false,
    },
    lastSeen: {
        type: Date,
        default: Date.now,
    },
    // Chat-related fields
    lastMessage: {
        type: String,
        default: "",
    },
    lastMessageTime: {
        type: Date,
        default: null,
    },
    // Relationships and controls
    blockedUsers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: []
    }]
}, { 
    timestamps: true,
    // Add compound indexes for better query performance
    indexes: [
        { email: 1 },
        { username: 1 },
        { isEmailVerified: 1, isRegistrationComplete: 1 },
        { isOnline: 1, lastSeen: 1 }
    ]
});

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
    // Only hash password if it's modified and exists
    if (!this.isModified('password') || !this.password) {
        return next();
    }
    
    try {
        const bcrypt = require('bcryptjs');
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
    if (!this.password) return false;
    return await bcrypt.compare(candidatePassword, this.password);
};

// Remove sensitive fields from JSON output
userSchema.methods.toJSON = function() {
    const user = this.toObject();
    delete user.password;
    delete user.emailVerificationCode;
    delete user.__v;
    return user;
};

const User = mongoose.model("User", userSchema);
module.exports = User;