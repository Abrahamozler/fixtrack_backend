const Record = require('../models/recordModel.js');

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

// --- THIS IS THE MISSING FUNCTION ---
const getMonthlyEarningsTrend = async () => {
    const result = await Record.aggregate([
        { $match: { paymentStatus: 'Paid' } },
        {
            $group: {
                _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
                earnings: { $sum: "$totalPrice" }
            }
        },
        { $sort: { "_id.year": -1, "_id.month": -1 } },
        { $limit: 12 }
    ]);
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    // Reverse the results to show oldest first on the chart
    return result.reverse().map(item => ({
        name: `${monthNames[item._id.month - 1]} '${String(item._id.year).slice(2)}`,
        earnings: item.earnings
    }));
};
// --- END OF MISSING FUNCTION ---

const getFinancialSummary = async (req, res) => {
  try {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const endOfYear = new Date(now.getFullYear() + 1, 0, 1);

    const dailyStats = await getStatsForPeriod(startOfToday, endOfToday);
    const monthlyStats = await getStatsForPeriod(startOfMonth, endOfMonth);
    const yearlyStats = await getStatsForPeriod(startOfYear, endOfYear);
    
    // This line will now work correctly because the function exists
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
