const express = require('express');
const router = express.Router();
const {
  getRecords,
  getRecordById,
  createRecord,
  updateRecord,
  deleteRecord,
  exportExcel,
  exportPdf,
  generateInvoicePdf,
} = require('../controllers/recordController.js');
const { protect, admin } = require('../middleware/authMiddleware.js');
const upload = require('../utils/fileUpload.js');

// Multer uploader (handles before/after photos)
const uploader = upload.fields([
  { name: 'beforePhoto', maxCount: 1 },
  { name: 'afterPhoto', maxCount: 1 },
]);

// --- Routes ---

// ✅ Get all records / Create new record
router.route('/')
  .get(protect, getRecords)
  .post(protect, uploader, createRecord);

// ✅ Export routes
router.get('/export/excel', protect, admin, exportExcel);
router.get('/export/pdf', protect, admin, exportPdf);

// ✅ Single invoice PDF
router.get('/:id/invoice', protect, admin, generateInvoicePdf);

// ✅ Single record operations
router.route('/:id')
  .get(protect, getRecordById)
  .put(protect, admin, uploader, updateRecord)
  .delete(protect, admin, deleteRecord);

module.exports = router;
