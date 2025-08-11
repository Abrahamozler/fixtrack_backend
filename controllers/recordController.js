const Record = require('../models/recordModel');
const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const PDFDocument = require('pdfkit');
const xlsx = require('xlsx');

// @desc    Get all records with filtering, sorting, pagination
// @route   GET /api/records
// @access  Private
const getRecords = async (req, res) => {
  const { search, status, sort } = req.query;
  const query = {};

  if (search) {
    query.$or = [
      { mobileModel: { $regex: search, $options: 'i' } },
      { customerName: { $regex: search, $options: 'i' } },
    ];
  }

  if (status) {
    query.paymentStatus = status;
  }

  let sortOption = { createdAt: -1 }; // newest first
  if (sort === 'oldest') {
    sortOption = { createdAt: 1 };
  }

  try {
    const records = await Record.find(query).sort(sortOption).populate('user', 'name');
    res.json(records);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get a single record
// @route   GET /api/records/:id
// @access  Private
const getRecordById = async (req, res) => {
    try {
        const record = await Record.findById(req.params.id);
        if (!record) {
            return res.status(404).json({ message: 'Record not found' });
        }
        res.json(record);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};


// @desc    Create a new record
// @route   POST /api/records
// @access  Private
const createRecord = async (req, res) => {
  const {
    mobileModel,
    customerName,
    customerPhone,
    complaint,
    spareParts, // expects an array of objects
    serviceCharge,
    paymentStatus
  } = req.body;

  try {
    const record = new Record({
      mobileModel,
      customerName,
      customerPhone,
      complaint,
      spareParts: JSON.parse(spareParts), // Frontend sends stringified JSON
      serviceCharge,
      paymentStatus,
      user: req.user._id,
    });

    if (req.files && req.files.beforePhoto) {
        record.beforePhoto = {
            url: req.files.beforePhoto[0].path,
            public_id: req.files.beforePhoto[0].filename
        };
    }
    if (req.files && req.files.afterPhoto) {
        record.afterPhoto = {
            url: req.files.afterPhoto[0].path,
            public_id: req.files.afterPhoto[0].filename
        };
    }

    const createdRecord = await record.save();
    res.status(201).json(createdRecord);
  } catch (error) {
    res.status(400).json({ message: 'Invalid data', error: error.message });
  }
};

// @desc    Update a record
// @route   PUT /api/records/:id
// @access  Private/Admin
const updateRecord = async (req, res) => {
  try {
    const record = await Record.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ message: 'Record not found' });
    }

    // Only Admin can modify any record
    if (req.user.role !== 'Admin') {
        return res.status(401).json({ message: 'Not authorized' });
    }

    const {
        mobileModel,
        customerName,
        customerPhone,
        complaint,
        spareParts,
        serviceCharge,
        paymentStatus
    } = req.body;

    record.mobileModel = mobileModel || record.mobileModel;
    record.customerName = customerName || record.customerName;
    record.customerPhone = customerPhone || record.customerPhone;
    record.complaint = complaint || record.complaint;
    record.serviceCharge = serviceCharge || record.serviceCharge;
    record.paymentStatus = paymentStatus || record.paymentStatus;
    
    if (spareParts) {
        record.spareParts = JSON.parse(spareParts);
    }
    
    // Handle image updates
    if (req.files && req.files.beforePhoto) {
        if(record.beforePhoto && record.beforePhoto.public_id) {
            await cloudinary.uploader.destroy(record.beforePhoto.public_id);
        }
        record.beforePhoto = { url: req.files.beforePhoto[0].path, public_id: req.files.beforePhoto[0].filename };
    }
    if (req.files && req.files.afterPhoto) {
        if(record.afterPhoto && record.afterPhoto.public_id) {
            await cloudinary.uploader.destroy(record.afterPhoto.public_id);
        }
        record.afterPhoto = { url: req.files.afterPhoto[0].path, public_id: req.files.afterPhoto[0].filename };
    }

    const updatedRecord = await record.save();
    res.json(updatedRecord);

  } catch (error) {
    res.status(400).json({ message: 'Update failed', error: error.message });
  }
};

// @desc    Delete a record
// @route   DELETE /api/records/:id
// @access  Private/Admin
const deleteRecord = async (req, res) => {
    try {
        const record = await Record.findById(req.params.id);

        if (!record) {
            return res.status(404).json({ message: 'Record not found' });
        }
        
        // Only admin can delete
        if (req.user.role !== 'Admin') {
            return res.status(401).json({ message: 'Not authorized' });
        }

        // Delete images from cloudinary
        if (record.beforePhoto && record.beforePhoto.public_id) {
            await cloudinary.uploader.destroy(record.beforePhoto.public_id);
        }
        if (record.afterPhoto && record.afterPhoto.public_id) {
            await cloudinary.uploader.destroy(record.afterPhoto.public_id);
        }

        await record.deleteOne();
        res.json({ message: 'Record removed' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Export records to Excel
// @route   GET /api/records/export/excel
// @access  Private/Admin
const exportExcel = async (req, res) => {
    try {
        const records = await Record.find({}).sort({ createdAt: -1 });
        
        const data = records.map(r => {
            const sparePartsCost = r.spareParts.reduce((acc, p) => acc + p.price, 0);
            return {
                Date: r.createdAt.toLocaleDateString(),
                'Mobile Model': r.mobileModel,
                'Customer Name': r.customerName,
                'Customer Phone': r.customerPhone,
                Complaint: r.complaint,
                'Spare Parts Cost': sparePartsCost,
                'Service Charge': r.serviceCharge,
                'Total Price': r.totalPrice,
                Status: r.paymentStatus
            };
        });

        const worksheet = xlsx.utils.json_to_sheet(data);
        const workbook = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(workbook, worksheet, "Records");
        
        const buffer = xlsx.write(workbook, { bookType: 'xlsx', type: 'buffer' });

        res.setHeader('Content-Disposition', 'attachment; filename=records.xlsx');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);

    } catch (error) {
        res.status(500).json({ message: 'Export failed', error: error.message });
    }
};

// @desc    Export records to PDF
// @route   GET /api/records/export/pdf
// @access  Private/Admin
const exportPdf = async (req, res) => {
    try {
        const records = await Record.find({}).sort({ createdAt: -1 });

        const doc = new PDFDocument({ margin: 30, size: 'A4' });

        res.setHeader('Content-Disposition', 'attachment; filename=records.pdf');
        res.setHeader('Content-Type', 'application/pdf');
        doc.pipe(res);

        // Header
        doc.fontSize(20).text('Fix Track Pro - All Records', { align: 'center' });
        doc.moveDown();

        // Table Header
        const tableTop = doc.y;
        const itemX = 30;
        const dateX = 150;
        const customerX = 250;
        const totalX = 450;

        doc.fontSize(10)
           .text('Model', itemX, tableTop, { bold: true })
           .text('Date', dateX, tableTop, { bold: true })
           .text('Customer', customerX, tableTop, { bold: true })
           .text('Total (INR)', totalX, tableTop, { bold: true, align: 'right' });
        
        doc.moveTo(itemX - 10, doc.y).lineTo(570, doc.y).stroke();
        doc.moveDown();

        // Table Rows
        records.forEach(record => {
            const y = doc.y;
            doc.fontSize(10)
               .text(record.mobileModel, itemX, y)
               .text(record.createdAt.toLocaleDateString(), dateX, y)
               .text(record.customerName, customerX, y)
               .text(`₹${record.totalPrice}`, totalX, y, { align: 'right' });
            doc.moveDown();
        });

        doc.end();
    } catch (error) {
        res.status(500).json({ message: 'Export failed', error: error.message });
    }
};


module.exports = {
  getRecords,
  getRecordById,
  createRecord,
  updateRecord,
  deleteRecord,
  exportExcel,
  exportPdf,
};
