const express = require('express');
const { generateSitemap } = require('../controllers/sitemapService');

const router = express.Router();

router.get('/sitemap.xml', generateSitemap);

module.exports = router;