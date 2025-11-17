const Analytics = require('../model/analyticsModel');

/**
 * @desc    Create a new analytics record
 * @param   {Object} data - The data for the analytics record
 * @returns {Promise<Analytics>}
 */
exports.createAnalyticsRecord = async (data) => {
  return Analytics.create(data);
};
