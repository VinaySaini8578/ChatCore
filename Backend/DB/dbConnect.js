const mongoose = require("mongoose");

const dbConnect = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_CONNECT); // get connection string from the environment variable
        console.log("DB connection has been established");
        console.log("Mongoose status:", mongoose.connection.readyState); // 1 = connected
    } 
    catch (error) {
        console.error("DB connection failed:", error);
    }
};

module.exports = dbConnect;
