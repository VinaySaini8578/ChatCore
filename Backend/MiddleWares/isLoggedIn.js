const jwt = require("jsonwebtoken");
const User = require("../Models/userModel");

const isLoggedIn = async (req, res, next) => {
    try {
        // check if the jwt token is set in the cookies or not
        const token = req.cookies.jwt;
        if (!token) return res.status(401).send({ success: false, message: "No token found" });

        // verify the token if it is valid and not tampered
        const valid = jwt.verify(token, process.env.SECRET_KEY);
        if (!valid) return res.status(401).send({ success: false, message: "Invalid token" });

        // if the token is valid, then find the user from the database

        // "valid" has a userID extracted from payload which was produced when user was created
        const user = await User.findById(valid.userId).select("-password");  // exclude password
        if (!user) return res.status(404).send({ success: false, message: "User not found" });

        req.user = user; // put the DB data of user into req , to be accessed in next middleware
        next();
    } catch (error) {
        console.log("isLoggedIn error:", error);
        res.status(500).send({ success: false, message: "Internal server error" });
    }
};

module.exports = isLoggedIn;