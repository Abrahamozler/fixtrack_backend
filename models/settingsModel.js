const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  key: { type: String, default: 'app-settings', unique: true },
  staffReferralCode: { type: String, required: true, default: 'DEFAULT-CODE' }
});

const Settings = mongoose.model('Settings', settingsSchema);

module.exports = Settings;
