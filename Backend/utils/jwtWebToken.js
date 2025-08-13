// JWT is a token that is given to the user that contains the user's information and helps 
// the user to prove his identity in future logins

const jwt = require('jsonwebtoken');


const jwtToken = (userId, res) => {  // takes the userID and create a jwtToken for him
    const token = jwt.sign({userId},process.env.SECRET_KEY,{expiresIn: '30d'})  
    // .sign() creates the token with unique userID and the secret key that only server has

    res.cookie('jwt', token, {     // setting jwt token in cookie for ease for browser to detect jwt
        maxAge : 30*24*60*60*1000, // 30 days
        httpOnly: true,            // no access outright with JS , only browser can access
        sameSite : "strict",       // blocks cross-site requests
        secure:process.env.NODE_ENV === "production" // if its true then works only on HTTPS, otherwise HTTP too
    })
}
module.exports = jwtToken