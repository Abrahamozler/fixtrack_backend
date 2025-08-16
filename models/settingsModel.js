const mongoose = require('mongoose');

// This schema will store a single document with our app settings
const settingsSchema = new mongoose.Schema({
  // We use a fixed key to ensure there's only one settings document
  key: { type: String, default: 'app-settings', unique: true },
  staffReferralCode: { type: String, required: true, default: 'DEFAULT-CODE' }
});

const Settings = mongoose.model('Settings', settingsSchema);

module.exports = Settings;
