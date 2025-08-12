const Record = require('../models/recordModel.js');

// Helper function that now takes a start AND end date
const getStatsForPeriod = async (startDate, endDate) => {
    const matchQuery = {
        paymentStatus: 'Paid',
        createdAt: { $gte: startDate, $lt: endDate }
    };

    const stats = await Record.aggregate([
        { $match: matchQuery },
        {
            $group: {
                _id: null,
                totalCollections: { $sum: '$totalPrice' },
                totalServiceCharge: { $sum: '$serviceCharge' },
                totalSparePartsCost: { $sum: { $sum: '$spareParts.price' } }
            }
        }
    ]);

    if (stats.length === 0) {
        return { collections: 0, profit: { withParts: 0, withoutParts: 0 } };
    }

    const { totalCollections, totalServiceCharge, totalSparePartsCost } = stats[0];
    const profitWithParts = totalCollections - totalSparePartsCost;
    
    return {
        collections: totalCollections,
        profit: { withParts: profitWithParts, withoutParts: totalServiceCharge }
    };
};

const getMonthlyEarningsTrend = async () => {
    // ... (This function is correct and remains the same) ...
};

const getFinancialSummary = async (req, res) => {
  try {
    // --- THIS IS THE FINAL, CORRECTED DATE LOGIC ---
    const now = new Date();
    
    // Daily: from the start of today until the end of today
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

    // Monthly: from the start of this month until the start of next month
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    
    // Yearly: from the start of this year until the start of next year
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const endOfYear = new Date(now.getFullYear() + 1, 0, 1);

    // Get stats for each distinct period
    const dailyStats = await getStatsForPeriod(startOfToday, endOfToday);
    const monthlyStats = await getStatsForPeriod(startOfMonth, endOfMonth);
    const yearlyStats = await getStatsForPeriod(startOfYear, endOfYear);
    
    const earningsTrend = await getMonthlyEarningsTrend();

    res.json({
      dailyCollections: dailyStats.collections,
      monthlyCollections: monthlyStats.collections,
      yearlyCollections: yearlyStats.collections,
      dailyProfit: dailyStats.profit,
      monthlyProfit: monthlyStats.profit,
      yearlyProfit: yearlyStats.profit,
      earningsTrend,
    });
  } catch (error) {
    console.error("Summary Controller Error:", error);
    res.status(500).json({ message: 'Server Error' });
  }
};

module.exports = { getFinancialSummary };
