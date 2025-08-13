// --- File: routes/recordRoutes.js ---

const express = require('express');
const router = express.Router();
const {
  getRecords,
  getRecordById,
  createRecord,
  updateRecord,
  deleteRecord,
  generateInvoicePdf,
  getRecordStats // <-- IMPORT THE NEW STATS FUNCTION
} = require('../controllers/recordController.js');
const { protect, admin } = require('../middleware/authMiddleware.js');
const upload = require('../utils/fileUpload.js');

// This middleware for handling 'before' and 'after' photos is correct.
const uploader = upload.fields([
  { name: 'beforePhoto', maxCount: 1 },
  { name: 'afterPhoto', maxCount: 1 }
]);

// This route for GET and POST is correct. Any logged-in user can get records or create one.
router.route('/')
  .get(protect, getRecords)
  .post(protect, uploader, createRecord);

// --- NEW ROUTE for the Dashboard Stat Cards ---
// This must be placed BEFORE the '/:id' route, otherwise Express will think 'stats' is an ID.
router.route('/stats').get(protect, getRecordStats);


// --- EXISTING ROUTES ---

// The invoice route is correct. Currently, only admins can download.
router.get('/:id/invoice', protect, admin, generateInvoicePdf);

// These routes for specific records are correct.
// Anyone logged in can get a record by its ID.
// Only admins can update or delete a record.
router.route('/:id')
  .get(protect, getRecordById)
  .put(protect, admin, uploader, updateRecord)
  .delete(protect, admin, deleteRecord);

// Note: The exportExcel and exportPdf routes were removed from the controller in the last step.
// If you still need them, you would add them back to the controller and uncomment them here.
// router.get('/export/excel', protect, admin, exportExcel);
// router.get('/export/pdf', protect, admin, exportPdf);

module.exports = router;
