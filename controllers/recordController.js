const Record = require('../models/recordModel.js');
const cloudinary = require('cloudinary').v2;
const PDFDocument = require('pdfkit');
const xlsx = require('xlsx');

// --- GET ALL RECORDS (with new sorting, filtering, and pagination) ---
const getRecords = async (req, res) => {
  const { search, status, sort, startDate, endDate, page = 1 } = req.query;
  const query = {};
  const limit = 10; // Show 10 records per page
  const skip = (page - 1) * limit;

  if (search) {
    query.$or = [
      { mobileModel: { $regex: search, $options: 'i' } },
      { customerName: { $regex: search, $options: 'i' } },
    ];
  }
  if (status) {
    query.paymentStatus = status;
  }
  if (startDate) {
      if (!query.date) query.date = {};
      query.date.$gte = new Date(startDate);
  }
  if (endDate) {
      if (!query.date) query.date = {};
      const endOfDay = new Date(endDate);
      endOfDay.setHours(23, 59, 59, 999);
      query.date.$lte = endOfDay;
  }
  
  let sortOption = {};
  switch (sort) {
      case 'oldest': sortOption = { date: 1 }; break;
      case 'priceHigh': sortOption = { totalPrice: -1 }; break;
      case 'priceLow': sortOption = { totalPrice: 1 }; break;
      default: sortOption = { date: -1 }; // newest
  }

  try {
    const records = await Record.find(query)
      .sort(sortOption)
      .limit(limit)
      .skip(skip)
      .populate('user', 'name');
    
    const totalRecords = await Record.countDocuments(query);

    res.json({
      records,
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalRecords / limit),
    });
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// --- ALL OTHER FUNCTIONS ---
const getRecordById = async (req, res) => { /* ... (full function code) ... */ };
const createRecord = async (req, res) => { /* ... (full function code) ... */ };
const updateRecord = async (req, res) => { /* ... (full function code) ... */ };
const deleteRecord = async (req, res) => { /* ... (full function code) ... */ };
const exportExcel = async (req, res) => { /* ... (full function code) ... */ };
const exportPdf = async (req, res) => { /* ... (full function code) ... */ };
const generateInvoicePdf = async (req, res) => { /* ... (full function code) ... */ };

// --- FINAL EXPORTS ---
module.exports = {
  getRecords,
  getRecordById,
  createRecord,
  updateRecord,
  deleteRecord,
  exportExcel,
  exportPdf,
  generateInvoicePdf
};
