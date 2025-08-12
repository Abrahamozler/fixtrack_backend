const express = require('express');
const router = express.Router();
// Corrected Path: ../controllers/ not ../src/controllers/
const { getFinancialSummary } = require('../controllers/summaryController.js');
const { protect, admin } = require('../middleware/authMiddleware.js');

router.route('/').get(protect, admin, getFinancialSummary);

module.exports = router;
