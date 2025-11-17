const Analytics = require('../model/analyticsModel');

/**
 * @desc    Create a new analytics record
 * @param   {Object} data - The data for the analytics record
 * @returns {Promise<Analytics>}
 */
exports.createAnalyticsRecord = async (data) => {
  // To reduce noise, you might want to avoid logging certain frequent requests
  if (data.method === 'GET' && data.path.includes('/analytics')) {
    return; // Don't log analytics endpoint requests
  }
  return Analytics.create(data);
};
