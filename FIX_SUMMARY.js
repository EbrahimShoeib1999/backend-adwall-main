/**
 * Fix Summary: MongoDB Query Error - "Can't use $options"
 * 
 * Issue:
 * When filtering companies by categoryId using query parameters like:
 * GET /api/v1/companies?categoryId=69348b116e396f4a9b88ea20
 * 
 * The system was throwing an error: "Can't use $options"
 * 
 * Root Cause:
 * The ApiFeatures.filter() method was treating ALL string query parameters
 * as text fields and applying regex patterns with $options: 'i' for case-insensitive search.
 * However, categoryId is an ObjectId field, not a text field, and MongoDB doesn't
 * support regex operations on ObjectId fields.
 * 
 * Solution:
 * Updated the filter() method in utils/apiFeatures.js to:
 * 1. Identify fields that should be treated as exact matches (ObjectIds, IDs)
 * 2. Check if a field name ends with 'Id' or '_id' or is in a predefined list
 * 3. For ID fields: use exact match (no regex)
 * 4. For text fields: continue using case-insensitive regex
 * 
 * Files Modified:
 * - utils/apiFeatures.js (filter method)
 * 
 * Impact:
 * This fix applies to ALL endpoints using factory.getAll(), including:
 * - Companies
 * - Categories
 * - Users
 * - Coupons
 * - Campaigns
 * - And any other resources using the factory pattern
 * 
 * Testing:
 * Test the following endpoints to verify the fix:
 * 1. GET /api/v1/companies?categoryId=<valid_category_id>
 * 2. GET /api/v1/companies?categoryId=<valid_category_id>&page=1&limit=10
 * 3. GET /api/v1/companies?userId=<valid_user_id>
 * 4. Any other endpoint with ID-based filtering
 * 
 * Expected Result:
 * - No more "Can't use $options" errors
 * - Proper filtering by ObjectId fields
 * - Text search still works with case-insensitive regex
 */

// Example of how the fix works:

// BEFORE (causing error):
// Query: ?categoryId=69348b116e396f4a9b88ea20
// MongoDB Query: { categoryId: { $regex: "69348b116e396f4a9b88ea20", $options: "i" } }
// Result: ERROR - Can't use $options on ObjectId field

// AFTER (fixed):
// Query: ?categoryId=69348b116e396f4a9b88ea20
// MongoDB Query: { categoryId: "69348b116e396f4a9b88ea20" }
// Result: SUCCESS - Exact match on ObjectId field

// Text fields still work with regex:
// Query: ?companyName=test
// MongoDB Query: { companyName: { $regex: "test", $options: "i" } }
// Result: SUCCESS - Case-insensitive search on text field
