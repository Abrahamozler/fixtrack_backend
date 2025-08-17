const Settings = require("../models/settingsModel");

// Get current settings
const getSettings = async (req, res) => {
  try {
    let settings = await Settings.findOne({ key: "app-settings" });
    if (!settings) {
      // Create default settings if missing
      settings = await Settings.create({ staffReferralCode: "DEFAULT-CODE" });
    }
    res.json(settings);
  } catch (error) {
    console.error("Get settings error:", error);
    res.status(500).json({ message: "Failed to fetch settings" });
  }
};

// Update referral code
const updateSettings = async (req, res) => {
  const { staffReferralCode } = req.body;

  if (!staffReferralCode || !staffReferralCode.trim()) {
    return res.status(400).json({ message: "Referral code cannot be empty" });
  }

  try {
    const settings = await Settings.findOneAndUpdate(
      { key: "app-settings" },
      { staffReferralCode },
      { new: true, upsert: true } // create if missing
    );
    res.json(settings);
  } catch (error) {
    console.error("Update settings error:", error);
    res.status(500).json({ message: "Failed to update referral code" });
  }
};

module.exports = { getSettings, updateSettings };
