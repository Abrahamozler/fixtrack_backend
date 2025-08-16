const Settings = require('../models/settingsModel.js');

const getSettings = async (req, res) => {
    const settings = await Settings.findOne({ key: 'app-settings' });
    res.json(settings);
};

const updateSettings = async (req, res) => {
    const { staffReferralCode } = req.body;
    const settings = await Settings.findOneAndUpdate(
        { key: 'app-settings' },
        { staffReferralCode },
        { new: true, upsert: true } // upsert: create if it doesn't exist
    );
    res.json(settings);
};

module.exports = { getSettings, updateSettings };
