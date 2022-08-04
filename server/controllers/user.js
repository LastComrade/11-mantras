const User = require("../models/user");
const AstrologerInfo = require("../models/astrologerInfo");
const Payment = require("../models/payment");
const twilio = require("../utils/twilio");
const { generateToken } = require("../utils/auth");
const jwt = require('jsonwebtoken');

const user = {
  // For Login
  getOtp: async (req, res) => {
    try {
      const { phone } = req.body;
      const otp = Math.floor(Math.random() * 8999) + 1000;
      const user = await User.findOne({ phone });

      if (user) {
        user.otp = otp;
        user.save();
        // setting cookie for getting user's phone in verify otp with 15 minutes limit
        res.cookie("uPhone", phone, {expires: new Date(Date.now() + 900000)});
      } else {
        console.log("User not found");
        return res.status(500).json({
          message: "Something went wrong",
        });
      }

      // Send OTP to user
      try {
        if (process.env.NODE_ENV === "production") {
          const msg = await twilio.messages.create({
            body: `Your OTP is ${otp}`,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: phone,
          });
        } else {
          console.log(otp);
        }
      } catch (error) {
        console.log("Twilio message sent error - ", error);
        return res.status(500).json({
          message: "Something went wrong",
        });
      }

      return res.status(200).json({
        message: "OTP sent successfully",
      });
    } catch (error) {
      console.log("Controllers: getOtp - ", error);
      return res.status(500).json({
        message: "Something went wrong",
      });
    }
  },

  // For Registration
  registerGetOtp: async (req, res) => {
    try {
      const { name, phone, email, role } = req.body;
      const otp = Math.floor(Math.random() * 8999) + 1000;

      const foundUser = await User.findOne({ phone });
      console.log(foundUser);
      if(foundUser){
        return res.status(400).json({
          message: `User with entered phone number already exists`,
        });
      }else{

        const newUser = new User({
          name,
          phone,
          email,
          role,
          otp,
          credits: 10,
        })
        res.cookie("uPhone", phone, {expires: new Date(Date.now() + 900000)});
        await newUser.save();
      }

      // For sending OTP
      try{
        if (process.env.NODE_ENV === "production") {
          const msg = await twilio.messages.create({
            body: `Your OTP is ${otp}`,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: phone,
          });
        } else {
          console.log(otp);
        }
        return res.status(200).json({
          message: "OTP sent successfully",
        });
      }catch(error){
        console.log(error)
        return res.status(500).json({
          message: "Something went wrong",
        });
      }

    } catch(error){
      console.log(error);
      return res.status(500).json({
        message: "Something went wrong",
      });
    }
  },

  verifyOtp: async (req, res) => {
    try {
      const { phone, otp } = req.body;

      const user = await User.findOne({ phone });

      if (user) {
        if (user.otp === otp) {
          user.otp = null;
          user.approved = true;
          await user.save();
          const token = generateToken(user.id);
          res.cookie("user", token);
          return res.status(200).json({
            message: "OTP verified successfully",
            token,
          });
        } else {
          return res.status(400).json({
            message: "OTP is incorrect",
          });
        }
      } else {
        return res.status(404).json({
          message: "User with this phone number does not exist",
        });
      }
    } catch (error) {
      console.log("Controllers: verifyOtp - ", error);
      return res.status(500).json({
        message: "Something went wrong",
      });
    }
  },

  addAstrologerDetails: async (req, res) => {
    try {

      const userId = req.userId;
      const foundUser = await User.findOne({ _id: userId });

      if(foundUser.role !== "astrologer"){
        return res.status(400).json({
          message: "Entered user is not an astrologer",
        });
      }else if(foundUser.astrologerInfo !== null){
        return res.status(400).json({
          message: "Entered user already has astrologer details saved"
        });
      }

      const { description, languages, specialities, experience } = req.body;

      const newAstrologerInfo = new AstrologerInfo({
        description,
        languages,
        specialities,
        experience,
        userId: userId,
      })

      const savedInfo = await newAstrologerInfo.save();
      foundUser.astrologerInfo = savedInfo._id;
      await foundUser.save();

      return res.status(200).json({
        message: "Details saved successfully"
      })

    }catch(error){
      return res.status(500).json({ 
        message: "something went wrong",
      });
    }
  },

  userPaymentRecord: async (req, res) => {
    try {
      const userId = req.userId;
      const user = await User.findOne({ _id: userId });
      const paymentRecord = await Payment.find({ phone: user.phone });
      return res.status(200).json({
        message: "Payment record fetched successfully",
        paymentRecord,
      });
    } catch (error) {
      console.log("Controllers: userPaymentRecord - ", error);
      return res.status(500).json({
        message: "Something went wrong",
      });
    }
  },
  // to fetch data of all astrologers 
  getAstrologers: async (req, res) => {
    try {
      await User.find({ role: "astrologer" }, (error, astrologers) => {
        if (error) {
          return res.status(404).json({ message: "astrologers not found" });
        }
        else if (astrologers && astrologers.length > 0) {
          return res.status(200).json(astrologers);
        }
        else {
          return res.status(404).json({ message: "astrologers not found" });
        }
      }).clone();
    }
    catch (err) {
      // console.log(err)
      return res.status(500).json({ message: "something went wrong" });
    }
  },
  
  // For profile
  getUser: async (req, res) => {
    try{
      const userId = req.userId;
      const foundUser = await User.findOne({ _id: userId });

      if(foundUser.role === "astrologer" && foundUser.astrologerInfo !== null){
        await foundUser.populate("astrologerInfo");
      }

      return res.status(200).json({
        foundUser
      });

    }catch(error){
      return res.status(500).json({
        message: "Something went wrong"
      });
    }
  },

  // to save an individual user in DB
  updateUser: async (req, res) => {
    try {
      const { name, phone, email, role, profilePic } = req.body;
      const user = await User.findOne({ phone });
      
      if (user) {
        user.name = name;
        user.phone = phone;
        user.email = email;
        user.profilePic = profilePic;

        if(role === "user"){
          user.astrologerInfo = null;
          if(user.role === "astrologer"){
            await AstrologerInfo.findOneAndDelete({userId: user._id});
          }
        }else if(user.role === "astrologer"){
          const { description, languages, specialities, experience } = req.body;
          const foundInfo = await AstrologerInfo.findOne({ userId: user._id });

          if(foundInfo){
            foundInfo.description = description,
            foundInfo.languages = languages,
            foundInfo.specialities = specialities,
            foundInfo.experience = experience,
            await foundInfo.save();
          }else{
            user.role = "user";
            await user.save();
            return res.status(500).json({
              message: "Something went wrong, Please try again",
            });
          }

        }else{
          const newAstrologerInfo = new AstrologerInfo({
            userId: user._id,
            description,
            languages,
            specialities,
            experience,
          });
          const savedInfo = await newAstrologerInfo.save();
          user.role = "astrologer"
          user.astrologerInfo = savedInfo._id;
        }

        await user.save();
        return res.status(200).json({
          message: "User Saved Successfully",
        });
      } else {
        return res.status(404).json({
          message: "User does not exist",
        });
      }
    } catch (error) {
      console.log("Controllers: updateUser - ", error);
      return res.status(500).json({
        message: "Something went wrong",
      });
    }
  },
  // to get data of an individual astrologer
  getAstrologer: async (req, res) => {
    try {
      const { phone } = req.params;
      await User.findOne({ role: "astrologer", phone }, (error, astrologer) => {
        if (error) {
          return res.status(500).json({ message: "something went wrong" });
        }
        else if (astrologer) {
          return res.status(200).json(astrologer);
        }
        else {
          return res.status(404).json({ message: "astrologer not found" });
        }
      }).clone();
    }
    catch (err) {
      return res.status(400).json({ message: "something went wrong" });
    }
  },

  // To be modified
  deleteUser: async (req, res) => {
    try {
      const { phone } = req.params;
      otp = Math.floor(Math.random() * 8999) + 1000;
      const user = await User.findOne({ phone });
      if(user){
        user.otp = otp;
        await user.save();
      }else{
        return res.status(404).json({
          message: "User not found"
        })
      }

    }catch( err ){
      return res.status(500).json({
        message: "Something went wrong"
      })
    }

    try{
      if(process.env.NODE_ENV === "production"){
        await twilio.messages.create({
          body: `Your OTP for account deletion is ${otp}`,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: phone
        })
      }else{
        console.log(otp);
      }
      return res.status(200).json({
        message: "OTP sent successfully"
      })
    }catch( err ){
      console.log(err);
      return res.status(500).json({
        message: "Not able to send otp at the moment"
      })
    }
  },

  verifyDeleteOtp: async (req, res) => {
    try{
      const { otp, phone } = req.body;
      const user = await User.findOne({ phone });
      if(user){
        if(otp == user.otp){
          await user.delete();
          return res.status(200).json({
            message: "User deleted successfully"
          })
        }else{
          return res.status(400).json({
            message: "Incorrect OTP"
          })
        }
      }else{
        return res.status(404).json({
          message: "User not found"
        })
      }
    }catch( err ){
      return res.status(500).json({
        message: "Something went wrong"
      })
    }
  },
  getTransactionDetail: async (req, res) => {
    try {
      const paymentId = req.params.paymentId;
      const userId = req.userId;
      await User.findOne({ _id: userId }, async (err, foundUser) => {
        if(err){
          console.log(err);
          return res.status(500).json({
            message: "Something went wrong"
          })
        }else if(foundUser){
          await Payment.findOne({ paymentId }, (err, foundTransaction) => {
            if(err){
              console.log(err);
              return res.status(500).json({
                message: "Something went wrong"
              })
            }else if(foundTransaction){
              console.log(foundTransaction);
              return res.status(200).json(foundTransaction);
            }else{
              return res.status(404).json({
                message: "Payment record not found"
              })
            }
          }).clone();
        }else{
          return res.status(404).json({
            message: "User not found"
          })
        }
      }).clone();
    }
    catch(err){
      console.log(err);
      return res.status(500).json({
        message: "Something went wrong"
      })
    }
  }
};

module.exports = user;
