const express = require("express");
const { userRegister, userLogin, logOut } = require("../Controllers/userRouteController");
const Router = express.Router();

Router.post("/register", userRegister);
Router.post("/login", userLogin);
Router.post("/logout", logOut);

module.exports = Router;