const express = require('express');
const router = express.Router();
const { getServiceAnalysis } = require('../controllers/analysisController.js');
const { protect, admin } = require('../middleware/authMiddleware.js');

// This route will be protected and only accessible by Admins
router.route('/').get(protect, admin, getServiceAnalysis);

module.exports = router;
