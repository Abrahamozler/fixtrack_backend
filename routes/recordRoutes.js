const express = require('express');
const router = express.Router();
const {
  getRecords,
  getRecordById,
  createRecord,
  updateRecord,
  deleteRecord,
  exportExcel,
  exportPdf
} = require('../controllers/recordController');
const { protect, admin } = require('../middleware/authMiddleware');
const upload = require('../utils/fileUpload');

const uploader = upload.fields([
  { name: 'beforePhoto', maxCount: 1 },
  { name: 'afterPhoto', maxCount: 1 }
]);

router.route('/')
  .get(protect, getRecords)
  .post(protect, uploader, createRecord);

router.get('/export/excel', protect, admin, exportExcel);
router.get('/export/pdf', protect, admin, exportPdf);

router.route('/:id')
  .get(protect, getRecordById)
  .put(protect, admin, uploader, updateRecord)
  .delete(protect, admin, deleteRecord);

module.exports = router;
