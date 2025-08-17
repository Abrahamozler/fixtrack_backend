const Settings = require('../models/settingsModel.js');

const getSettings = async (req, res) => {
    try {
        let settings = await Settings.findOne({ key: 'app-settings' });
        if (!settings) {
            settings = await Settings.create({});
        }
        res.json(settings);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to fetch settings' });
    }
};

const updateSettings = async (req, res) => {
    try {
        const { staffReferralCode } = req.body;
        if (!staffReferralCode) return res.status(400).json({ message: 'Referral code is required' });

        const settings = await Settings.findOneAndUpdate(
            { key: 'app-settings' },
            { staffReferralCode },
            { new: true, upsert: true }
        );
        res.json(settings);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to update settings' });
    }
};

module.exports = { getSettings, updateSettings };
