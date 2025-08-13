const express = require('express');
const router = express.Router();
const {
  getRecords,
  getRecordById,
  createRecord,
  updateRecord,
  deleteRecord,
  generateInvoicePdf,
  getRecordStats
} = require('../controllers/recordController.js'); // <-- FIX: Removed exportExcel and exportPdf from imports
const { protect, admin } = require('../middleware/authMiddleware.js');
const upload = require('../utils/fileUpload.js');

const uploader = upload.fields([
  { name: 'beforePhoto', maxCount: 1 },
  { name: 'afterPhoto', maxCount: 1 }
]);

router.route('/')
  .get(protect, getRecords)
  .post(protect, uploader, createRecord);

router.route('/stats').get(protect, getRecordStats);

// --- FIX: Removed the routes that were causing the crash ---
// router.get('/export/excel', protect, admin, exportExcel);
// router.get('/export/pdf', protect, admin, exportPdf);

router.get('/:id/invoice', protect, admin, generateInvoicePdf);

router.route('/:id')
  .get(protect, getRecordById)
  .put(protect, admin, uploader, updateRecord)
  .delete(protect, admin, deleteRecord);

module.exports = router;
