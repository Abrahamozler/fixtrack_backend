const Record = require('../models/recordModel.js');

// This controller now accepts startDate and endDate for precise filtering.
const getServiceAnalysis = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        // Build the query based on the provided dates
        const matchQuery = { paymentStatus: 'Paid' };
        if (startDate && endDate) {
            const endOfDay = new Date(endDate);
            endOfDay.setHours(23, 59, 59, 999); // Include the entire end day
            matchQuery.createdAt = { $gte: new Date(startDate), $lte: endOfDay };
        }

        const analysis = await Record.aggregate([
            { $match: matchQuery },
            {
                $group: {
                    _id: null,
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
