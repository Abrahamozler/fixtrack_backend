// --- CREATE NEW RECORD ---
const createRecord = async (req, res) => {
  try {
    const {
      customerName,
      mobileModel,
      customerPhone,
      complaint,         // <-- match frontend
      serviceCharge,     // <-- match frontend
      paymentStatus,
    } = req.body;

    let spareParts = [];
    if (req.body.spareParts) {
      try {
        spareParts = JSON.parse(req.body.spareParts);
      } catch (err) {
        return res.status(400).json({ message: 'Invalid spareParts format' });
      }
    }

    let beforePhotoUrl = null;
    let afterPhotoUrl = null;

    if (req.files?.beforePhoto) {
      const before = await cloudinary.uploader.upload(req.files.beforePhoto[0].path, { folder: 'records' });
      beforePhotoUrl = before.secure_url;
    }
    if (req.files?.afterPhoto) {
      const after = await cloudinary.uploader.upload(req.files.afterPhoto[0].path, { folder: 'records' });
      afterPhotoUrl = after.secure_url;
    }

    // calculate totalPrice
    const partsTotal = spareParts.reduce((sum, p) => sum + (parseFloat(p.price) || 0), 0);
    const service = parseFloat(serviceCharge) || 0;
    const totalPrice = partsTotal + service;

    const newRecord = new Record({
      customerName,
      customerPhone,
      mobileModel,
      complaint,
      serviceCharge,
      spareParts,
      totalPrice,
      paymentStatus,
      date: new Date(),
      beforePhoto: beforePhotoUrl,
      afterPhoto: afterPhotoUrl,
      user: req.user?._id,
    });

    const saved = await newRecord.save();
    res.status(201).json(saved);
  } catch (error) {
    console.error('Error creating record:', error);
    res.status(500).json({ message: 'Failed to create record', error: error.message });
  }
};
