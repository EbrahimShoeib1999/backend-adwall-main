// sitemapService.js
const { SitemapStream, streamToPromise } = require('sitemap');
const { Readable } = require('stream');
const asyncHandler = require('express-async-handler');
const Company = require('../model/companyModel');
const Category = require('../model/categoryModel');

// @desc    Generate Sitemap
// @route   GET /api/v1/sitemap.xml
// @access  Public
exports.generateSitemap = asyncHandler(async (req, res, next) => {
  const links = [];

  links.push({ url: '/', changefreq: 'daily', priority: 1.0 });
  links.push({ url: '/about-us', changefreq: 'monthly', priority: 0.7 });
  links.push({ url: '/privacy-policy', changefreq: 'monthly', priority: 0.7 });
  links.push({ url: '/faq', changefreq: 'monthly', priority: 0.7 });

  const categories = await Category.find({});
  categories.forEach((category) => {
    links.push({ url: `/category/${category.slug}`, changefreq: 'weekly', priority: 0.9 });
  });

  const companies = await Company.find({ isApproved: true });
  companies.forEach((company) => {
    links.push({ url: `/company/${company.slug}`, changefreq: 'daily', priority: 0.8 });
  });

  const stream = new SitemapStream({ hostname: process.env.FRONTEND_URL });
  const xml = await streamToPromise(Readable.from(links).pipe(stream));

  res.header('Content-Type', 'application/xml');
  res.status(200).send(xml.toString());
});