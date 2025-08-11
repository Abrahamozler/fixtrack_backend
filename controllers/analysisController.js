const Record = require('../models/recordModel.js');

// Helper to get the start date based on a period string
const getStartDate = (period) => {
    const today = new Date();
    switch (period) {
        case 'daily':
            return new Date(today.setHours(0, 0, 0, 0));
        case 'weekly':
            const startOfWeek = new Date(today);
            startOfWeek.setDate(today.getDate() - 7);
            return startOfWeek;
        case 'monthly':
            const startOfMonth = new Date(today);
            startOfMonth.setMonth(today.getMonth() - 1);
            return startOfMonth;
        default: // 'all' or any other value
            return null; // No start date means all time
    }
};

// @desc    Get service analysis statistics
// @route   GET /api/analysis
// @access  Private/Admin
const getServiceAnalysis = async (req, res) => {
    try {
        const { period = 'all' } = req.query;
        const startDate = getStartDate(period);

        const matchQuery = { paymentStatus: 'Paid' };
        if (startDate) {
            matchQuery.createdAt = { $gte: startDate };
        }

        const analysis = await Record.aggregate([
            { $match: matchQuery },
            {
                $group: {
                    _id: null, // Group all documents into a single result
                    totalRepairs: { $sum: 1 },
                    totalIncome: { $sum: '$totalPrice' },
                    totalSparePartsCost: { $sum: { $sum: '$spareParts.price' } }
                }
            },
            {
                $project: {
                    _id: 0,
                    totalRepairs: 1,
                    totalIncome: 1,
                    totalSparePartsCost: 1,
                    profit: { $subtract: ['$totalIncome', '$totalSparePartsCost'] }
                }
            }
        ]);

        // If no records found, return a default object
        const result = analysis[0] || {
            totalRepairs: 0,
            totalIncome: 0,
            totalSparePartsCost: 0,
            profit: 0
        };

        res.json(result);
    } catch (error) {
        console.error('Analysis Error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

module.exports = { getServiceAnalysis };
