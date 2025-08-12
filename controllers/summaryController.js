const Record = require('../models/recordModel.js');

// This helper function is now simpler and correct.
const getStatsForPeriod = async (startDate) => {
    const matchQuery = { paymentStatus: 'Paid' };
    if (startDate) {
        matchQuery.createdAt = { $gte: startDate };
    }

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
    return result.reverse().map(item => ({
        name: `${monthNames[item._id.month - 1]} '${String(item._id.year).slice(2)}`,
        earnings: item.earnings
    }));
};

const getFinancialSummary = async (req, res) => {
  try {
    const now = new Date();
    const startOfToday = new Date(new Date().setHours(0, 0, 0, 0));
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const dailyStats = await getStatsForPeriod(startOfToday);
    const monthlyStats = await getStatsForPeriod(startOfMonth);
    const yearlyStats = await getStatsForPeriod(startOfYear);
    
    const earningsTrend = await getMonthlyEarningsTrend();

    res.json({
      dailyCollections: dailyStats.collections,
      monthlyCollections: monthlyStats.collections,
      yearlyCollections: yearlyStats.collections,
      dailyProfit: dailyStats.profit,
      monthlyProfit: monthlyStats.profit,
      yearlyProfit: yearlyStats.profit, // Added yearly profit for consistency
      earningsTrend,
    });
  } catch (error) {
    console.error("Summary Controller Error:", error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

module.exports = { getFinancialSummary };
