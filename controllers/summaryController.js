const Record = require('../models/recordModel.js');

const getCollectionForPeriod = async (startDate, endDate = new Date()) => {
  const result = await Record.aggregate([
    { $match: { paymentStatus: 'Paid', createdAt: { $gte: startDate, $lt: endDate } } },
    { $group: { _id: null, total: { $sum: '$totalPrice' } } },
  ]);
  return result.length > 0 ? result[0].total : 0;
};

const getProfitForPeriod = async (startDate, endDate = new Date()) => {
    const records = await Record.find({ paymentStatus: 'Paid', createdAt: { $gte: startDate, $lt: endDate } });
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
    // ... (This function remains the same and is correct) ...
};

const getFinancialSummary = async (req, res) => {
  try {
    // THIS IS THE CORRECTED LOGIC
    const now = new Date();
    // Use new Date() for each calculation to avoid mutation
    const startOfToday = new Date(new Date().setHours(0, 0, 0, 0));
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

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
