const User = require("../Models/userModel.js");
const Conversation = require("../Models/conversationModel.js")
const mongoose = require("mongoose")
const getUserBySearch = async (req, res) => {
    try {
        const search = req.query.search || ''; // ID to  be searched : if exists ; else empty string
        const currentUserID = req.user._id;    // current userID , to exclude it later

        const user = await User.find({
            $and: [
                {
                    $or: [
                        { username: { $regex: '.*' + search + '.*', $options: 'i' } }, // case insensitive search
                        { fullname: { $regex: '.*' + search + '.*', $options: 'i' } }  // .* means anything
                    ]
                },
                { _id: { $ne: currentUserID } } // exclude current user - to avoid getting ourselves if similar name is searched 
                                                // ne : not equal
            ]
        }).select("-password"); // all fields except password

        res.status(200).send(user);

    } catch (error) {
        console.log(error);
        res.status(500).send({
            success: false,
            message: error.message
        });
    }
};

const getCurrentChatters = async (req, res) => {
    try {
        // userId was injected into req via isLoggedIn middleware
        const currentUserID = req.user._id;

        // Get conversations where current user is a participant
        const currentChatters = await Conversation.find({
        participants: { $in: [currentUserID] }
        }).sort({ updatedAt: -1 }); // descending order : latest chat first ; 1 for ascending

        if (!currentChatters.length) {
            return res.status(200).send([]); // return empty array if no chats found
        }

        // Extract all other participants' ID while removing ours from them
        const allIDs = currentChatters.flatMap(conv => // flat Map : map and flatten - nested array to normal array
            conv.participants.filter(id => id.toString() !== currentUserID.toString())
        );

        //  Remove duplicates if multiple chats with single person
        const uniqueIDs = [...new Set(allIDs.map(id => id.toString()))];

        //  Fetch user details to be shown
        const users = await User.find({ _id: { $in: uniqueIDs } })
            .select("-password -email");

        res.status(200).send(users);

    } catch (error) {
        console.error(error);
        res.status(500).send({ success: false, message: error.message });
    }
};


module.exports = {getUserBySearch, getCurrentChatters};
