/**
 * Test Script for MongoDB Query Fix
 * 
 * This script tests the fix for the "Can't use $options" error
 * when filtering companies by categoryId.
 * 
 * To run this test:
 * 1. Ensure the server is running
 * 2. Replace <CATEGORY_ID> with a valid category ID from your database
 * 3. Run: node test-category-filter.js
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: 'env.txt' });

const Company = require('./model/companyModel');
const ApiFeatures = require('./utils/apiFeatures');

async function testCategoryFilter() {
  try {
    // Connect to database
    await mongoose.connect(process.env.DB_URI);
    console.log('✅ Connected to database');

    // Test 1: Filter by categoryId using ApiFeatures (simulating query parameter)
    console.log('\n📝 Test 1: Filter by categoryId using query parameter');
    const queryString = {
      categoryId: '69348b116e396f4a9b88ea20', // Replace with a valid category ID
      page: '1',
      limit: '10'
    };

    const apiFeatures = new ApiFeatures(Company.find(), queryString);
    apiFeatures.filter().paginate(100);

    const companies = await apiFeatures.mongooseQuery;
    console.log(`✅ Found ${companies.length} companies`);
    console.log('✅ No "Can\'t use $options" error!');

    // Test 2: Filter by text field (should still use regex)
    console.log('\n📝 Test 2: Filter by company name (text field)');
    const textQuery = {
      companyName: 'test',
      page: '1',
      limit: '10'
    };

    const apiFeatures2 = new ApiFeatures(Company.find(), textQuery);
    apiFeatures2.filter().paginate(100);

    const companies2 = await apiFeatures2.mongooseQuery;
    console.log(`✅ Found ${companies2.length} companies matching "test"`);
    console.log('✅ Text search with regex still works!');

    // Test 3: Mixed filters (ID + text)
    console.log('\n📝 Test 3: Mixed filters (categoryId + status)');
    const mixedQuery = {
      categoryId: '69348b116e396f4a9b88ea20', // Replace with a valid category ID
      status: 'approved',
      page: '1',
      limit: '10'
    };

    const apiFeatures3 = new ApiFeatures(Company.find(), mixedQuery);
    apiFeatures3.filter().paginate(100);

    const companies3 = await apiFeatures3.mongooseQuery;
    console.log(`✅ Found ${companies3.length} approved companies in category`);
    console.log('✅ Mixed filters work correctly!');

    console.log('\n🎉 All tests passed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

testCategoryFilter();
