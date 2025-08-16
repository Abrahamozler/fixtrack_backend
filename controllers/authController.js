const User = require("../models/userModel");
const Settings = require("../models/settingsModel");
const jwt = require("jsonwebtoken");

// Utility to generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });
};

// @desc   Register a new user
// @route  POST /api/auth/register
// @access Public (but requires referral code unless first user)
const registerUser = async (req, res) => {
  try {
    const { username, password, referralCode } = req.body;

    // Check if username already exists
    const userExists = await User.findOne({ username });
    if (userExists) {
      return res.status(400).json({ message: "Username is already taken" });
    }

    // First user ever → Admin, no referral required
    const isFirstAccount = (await User.countDocuments({})) === 0;
    if (isFirstAccount) {
      const adminUser = await User.create({
        username,
        password,
        role: "Admin",
      });

      // Create default settings doc with referral code placeholder
      await Settings.create({
        key: "app-settings",
        staffReferralCode: "PLEASE-UPDATE-ME",
      });

      return res.status(201).json({
        _id: adminUser._id,
        username: adminUser.username,
        role: adminUser.role,
        token: generateToken(adminUser._id),
      });
    }

    // For others → referral code required
    if (!referralCode) {
      return res
        .status(400)
        .json({ message: "A referral code is required to register" });
    }

    const appSettings = await Settings.findOne({ key: "app-settings" });
    if (!appSettings || referralCode !== appSettings.staffReferralCode) {
      return res.status(401).json({ message: "Invalid referral code" });
    }

    // Referral code valid → create Staff user
    const staffUser = await User.create({
      username,
      password,
      role: "Staff",
    });

    if (staffUser) {
      return res.status(201).json({
        _id: staffUser._id,
        username: staffUser.username,
        role: staffUser.role,
        token: generateToken(staffUser._id),
      });
    } else {
      return res.status(400).json({ message: "Invalid user data" });
    }
  } catch (error) {
    console.error("Register Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc   Login user
// @route  POST /api/auth/login
// @access Public
const loginUser = async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ username });

    if (user && (await user.matchPassword(password))) {
      res.json({
        _id: user._id,
        username: user.username,
        role: user.role,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: "Invalid username or password" });
    }
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { registerUser, loginUser };
