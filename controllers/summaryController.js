// Corrected Path: ../models/ not ../src/models/
const Record = require('../models/recordModel.js');

const getCollectionForPeriod = async (startDate) => {
  const result = await Record.aggregate([
    { $match: { paymentStatus: 'Paid', createdAt: { $gte: startDate } } },
    { $group: { _id: null, total: { $sum: '$totalPrice' } } },
  ]);
  return result.length > 0 ? result[0].total : 0;
};

const getProfitForPeriod = async (startDate) => {
    const records = await Record.find({ paymentStatus: 'Paid', createdAt: { $gte: startDate } });
    let totalProfitWithParts = 0;
    let totalProfitWithoutParts = 0;
    records.forEach(record => {
        const sparePartsCost = record.spareParts.reduce((acc, part) => acc + part.price, 0);
        totalProfitWithParts += (record.totalPrice - sparePartsCost);
        totalProfitWithoutParts += record.serviceCharge;
    });
    return { withParts: totalProfitWithParts, withoutParts: totalProfitWithoutParts };
};

const getMonthlyEarningsTrend = async () => {
    const result = await Record.aggregate([
        { $match: { paymentStatus: 'Paid' } },
        {
            $group: {
                _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
                totalEarnings: { $sum: "$totalPrice" }
            }
        },
        { $sort: { "_id.year": -1, "_id.month": -1 } },
        { $limit: 12 }
    ]);
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return result.reverse().map(item => ({
        name: `${monthNames[item._id.month - 1]} ${item._id.year}`,
        earnings: item.totalEarnings
    }));
};

const getFinancialSummary = async (req, res) => {
  try {
    const today = new Date();
    const startOfToday = new Date(today.setHours(0, 0, 0, 0));
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfYear = new Date(today.getFullYear(), 0, 1);

    const dailyCollections = await getCollectionForPeriod(startOfToday);
    const monthlyCollections = await getCollectionForPeriod(startOfMonth);
    const yearlyCollections = await getCollectionForPeriod(startOfYear);

    const dailyProfit = await getProfitForPeriod(startOfToday);
    const monthlyProfit = await getProfitForPeriod(startOfMonth);
    const yearlyProfit = await getProfitForPeriod(startOfYear);
    
    const earningsTrend = await getMonthlyEarningsTrend();

    res.json({
      dailyCollections, monthlyCollections, yearlyCollections,
      dailyProfit, monthlyProfit, yearlyProfit,
      earningsTrend,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

module.exports = { getFinancialSummary };
