const bcryptjs = require("bcryptjs")
const User = require("../Models/userModel")
const jwtToken = require("../utils/jwtWebToken")

const userRegister = async (req, res) => {
  try {
    const { fullname, username, email, gender, password, profilepic } = req.body;

    const existingUser = await User.findOne({
      $or: [{ username }, { email }]  // check if username "OR" email already exists
    });

    if (existingUser) {
      return res.status(400).json({success: false, msg: "Username or Email already exists"});
    }
    // Protect the password before registering the user
    const hashPW = await bcryptjs.hash(password, 10);

    const newUser = await User.create({  // added to database
      fullname,
      username,
      email,
      gender,
      password: hashPW,
    });

    jwtToken(newUser._id, res); // create JWT token to permit Login

    res.status(201).json({  
      success: true,
      msg: "User registered successfully",
      user: {
        _id: newUser._id,
        fullname: newUser.fullname,
        username: newUser.username,
        email: newUser.email,
      },
    });
    console.log("New user created:", newUser);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false, msg: "Server error" });
  }
};

const userLogin = async (req, res) => {
  try {
    console.log("REQ BODY: ", req.body);
    const { email, password } = req.body;
    const existingUser = await User.findOne({ email });

    if (!existingUser) {
      return res.status(400).send({ success: false, msg: "Email isn't registered" });
    }

    // Matching the password
    const isMatch = await bcryptjs.compare(password, existingUser.password); 

    if (!isMatch) {
      return res.status(401).send({ success: false, msg: "Incorrect password" });
    }

    // Token to Login successfully
    jwtToken(existingUser._id, res);

    res.status(200).send({ // going to frontend to navigate to chatWindow
      _id: existingUser._id,
      fullname: existingUser.fullname,
      username: existingUser.username,
      profilepic: existingUser.profilepic,
      email: existingUser.email,
      message: "Login successful",
    });
  } catch (error) {
    console.error(error);
    res.status(500).send({ success: false, msg: "Server error" });
  }
};

const logOut = (req, res) => { // just delete awt token
    try {
      res.cookie("jwt", "", { maxAge : 0 })  // token set Null
      res.status(200).send({message:"Logout successful"})
    } 
    catch (error) {
      res.status(500).send({
          success: false,
          msg: error,
        })
        console.log(error)
    }
}

module.exports = { userRegister , userLogin, logOut};

