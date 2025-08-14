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
  generateInvoicePdf // Import the new function
} = require('../controllers/recordController.js');
const { protect, admin } = require('../middleware/authMiddleware.js');
const upload = require('../utils/fileUpload.js');

const uploader = upload.fields([
  { name: 'beforePhoto', maxCount: 1 },
  { name: 'afterPhoto', maxCount: 1 }
]);

router.route('/')
  .get(protect, getRecords)
  .post(protect, uploader, createRecord);

router.get('/export/excel', protect, admin, exportExcel);
router.get('/export/pdf', protect, admin, exportPdf);

// NEW ROUTE: For generating a single invoice PDF
router.get('/:id/invoice', protect, admin, generateInvoicePdf);

router.route('/:id')
  .get(protect, getRecordById)
  .put(protect, admin, uploader, updateRecord)
  .delete(protect, admin, deleteRecord);

module.exports = router;
