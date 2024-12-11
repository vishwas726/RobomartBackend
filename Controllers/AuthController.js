const User = require("../Models/user");
const { createSecretToken } = require("../util/SecretToken");
const bcrypt = require("bcryptjs");

module.exports.Signup = async (req, res, next) => {
  try {
    const { phoneNumber, password, name, createdAt } = req.body;
    const existingUser = await User.findOne({ phoneNumber });
    if (existingUser) {
      return res.json({ message: "User already exists" });
    }
    const user = await User.create({ phoneNumber, password, name, createdAt });
    const data={name:user.name , id:user._id , phoneNumber:user.phoneNumber}
    const token = createSecretToken(data);
    res.cookie("token", token, {
      withCredentials: true,
      httpOnly: false,
    });
    res
      .status(201)
      .json({ message: "User signed in successfully", success: true, data:{...data ,token} });
    next();
  } catch (error) {
    console.error(error);
  }
};



module.exports.Login = async (req, res, next) => {
    try {
      const { phoneNumber, password } = req.body;
      if(!phoneNumber || !password ){
        return res.json({message:'All fields are required'})
      }
      const user = await User.findOne({ phoneNumber });
      if(!user){
        return res.json({message:'Incorrect  phoneNumber' }) 
      }
      const auth = await bcrypt.compare(password,user.password)
      if (!auth) {
        return res.json({message:'Incorrect password ' }) 
      }
       const data={name:user.name , id:user._id , phoneNumber:user.phoneNumber}

       const token = createSecretToken(data);
       res.cookie("token", token, {
         withCredentials: true,
         httpOnly: false,
         maxAge: 7 * 24 * 60 * 60 * 1000,
       });
       res.status(201).json({ message: "User logged in successfully", success: true  , data:{...data ,token}});
       next()
    } catch (error) {
      console.error(error);
    }
  }