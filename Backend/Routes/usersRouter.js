const express = require("express");
const Router = express.Router();
const isLoggedIn = require("../MiddleWares/isLoggedIn.js")
const {getUserBySearch, getCurrentChatters }= require("../Controllers/userHandlerController.js")

Router.get("/search", isLoggedIn, getUserBySearch)
Router.get("/getCurrentChatters", isLoggedIn, getCurrentChatters)

module.exports = Router