// Replace your existing updateRecord function with this one

const updateRecord = async (req, res) => {
  try {
    const record = await Record.findById(req.params.id);
    if (!record) return res.status(404).json({ message: 'Record not found' });

    // Fields that are allowed to be updated via this endpoint
    const updatableFields = ['recordDate', 'mobileModel', 'customerName', 'customerPhone', 'complaint', 'serviceCharge', 'paymentStatus'];
    
    updatableFields.forEach(field => {
      // Use hasOwnProperty to check if the key was included in the request body
      if (req.body.hasOwnProperty(field)) {
          record[field] = req.body[field];
      }
    });

    if (req.body.hasOwnProperty('spareParts')) {
      record.spareParts = JSON.parse(req.body.spareParts);
    }
    
    // Logic to update photos would also check hasOwnProperty for req.files
    
    const updatedRecord = await record.save();
    res.json(updatedRecord);
  } catch (error) {
    res.status(400).json({ message: 'Update failed', error: error.message });
  }
};
