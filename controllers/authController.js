const User = require("../models/userModel");
const Settings = require("../models/settingsModel");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

// Generate JWT
const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });
};

// @desc    Register a new user (with dynamic referral code)
const registerUser = async (req, res) => {
  try {
    const { username, password, referralCode, role } = req.body;

    if (!username || !password || !referralCode) {
      return res.status(400).json({ message: "Please provide all fields" });
    }

    // Fetch current referral code from Settings
    const settings = await Settings.findOne({ key: 'app-settings' });
    const VALID_REFERRAL_CODE = settings?.staffReferralCode || "DEFAULT-CODE";

    if (referralCode !== VALID_REFERRAL_CODE) {
      return res.status(400).json({ message: "Invalid referral code" });
    }

    const userExists = await User.findOne({ username });
    if (userExists) {
      return res.status(400).json({ message: "Username already taken" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      username,
      password: hashedPassword,
      referralCode,
      role: role || "user",
    });

    res.status(201).json({
      _id: user.id,
      username: user.username,
      role: user.role,
      token: generateToken(user.id, user.role),
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Login user & get token
const loginUser = async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ username });

    if (user && (await bcrypt.compare(password, user.password))) {
      res.json({
        _id: user.id,
        username: user.username,
        role: user.role,
        token: generateToken(user.id, user.role),
      });
    } else {
      res.status(401).json({ message: "Invalid username or password" });
    }
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  registerUser,
  loginUser,
};
