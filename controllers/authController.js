const User = require('../models/userModel');
const jwt = require('jsonwebtoken');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

// ... (keep imports for User, jwt) ...
const Settings = require('../models/settingsModel.js'); // Add this new import

const registerUser = async (req, res) => {
  const { username, password, referralCode } = req.body;

  // First, check if username already exists
  const userExists = await User.findOne({ username });
  if (userExists) {
    return res.status(400).json({ message: 'Username is already taken' });
  }

  // The very first user to ever register becomes Admin, no referral code needed
  const isFirstAccount = (await User.countDocuments({})) === 0;
  if (isFirstAccount) {
    const adminUser = await User.create({ username, password, role: 'Admin' });
    // Also create the default settings document
    await Settings.create({ staffReferralCode: 'PLEASE-UPDATE-ME' });
    return res.status(201).json({ /* ... admin user data ... */ });
  }

  // For all subsequent registrations, a referral code is required
  if (!referralCode) {
    return res.status(400).json({ message: 'A referral code is required to register' });
  }

  // Check if the provided referral code is correct
  const appSettings = await Settings.findOne({ key: 'app-settings' });
  if (!appSettings || referralCode !== appSettings.staffReferralCode) {
    return res.status(401).json({ message: 'Invalid referral code' });
  }

  // If code is correct, create a Staff user
  const staffUser = await User.create({ username, password, role: 'Staff' });
  if (staffUser) {
    res.status(201).json({ /* ... staff user data ... */ });
  } else {
    res.status(400).json({ message: 'Invalid user data' });
  }
};

const loginUser = async (req, res) => {
  const { username, password } = req.body; // Login with username now
  const user = await User.findOne({ username });
  if (user && (await user.matchPassword(password))) {
    res.json({ _id: user._id, username: user.username, role: user.role, token: generateToken(user._id) });
  } else {
    res.status(401).json({ message: 'Invalid username or password' });
  }
};
