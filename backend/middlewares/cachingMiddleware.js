const NodeCache = require('node-cache');
const asyncHandler = require('express-async-handler');

// stdTTL: time to live in seconds for every cache entry
const cache = new NodeCache({ stdTTL: 60 * 5 }); // Cache for 5 minutes

const cachingMiddleware = asyncHandler(async (req, res, next) => {
  const key = req.originalUrl;
  const cachedResponse = cache.get(key);

  if (cachedResponse) {
    console.log(`Cache hit for ${key}`);
    return res.status(200).json(cachedResponse);
  }

  console.log(`Cache miss for ${key}`);
  const originalJson = res.json;

  res.json = (body) => {
    cache.set(key, body);
    originalJson.call(res, body);
  };

  next();
});

module.exports = cachingMiddleware;