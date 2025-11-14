const express = require('express');
const { testEndpoint } = require('../controllers/testController');

const router = express.Router();

router.get('/', testEndpoint);

module.exports = router;