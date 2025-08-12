const express = require('express');
const router = express.Router();
const { getServiceAnalysis } = require('../controllers/analysisController.js');
// NEW: Removed 'admin' from the import
const { protect } = require('../middleware/authMiddleware.js'); 

// NEW: Removed the 'admin' middleware from the route definition
router.route('/').get(protect, getServiceAnalysis);

module.exports = router;
