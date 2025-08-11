const express = require('express');
const router = express.Router();
const { getFinancialSummary } = require('../controllers/summaryController');
const { protect, admin } = require('../middleware/authMiddleware');

router.get('/', protect, admin, getFinancialSummary);

module.exports = router;
