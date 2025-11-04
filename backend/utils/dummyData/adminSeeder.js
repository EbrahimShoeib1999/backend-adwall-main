const fs = require('fs');
require('colors');
const dotenv = require('dotenv');
const User = require('../../model/userModel');
const dbConnection = require('../../config/database');

dotenv.config({ path: '../../.env' });

// connect to DB
dbConnection();

// Admin user data
const adminUser = {
    name: 'admin',
    email: 'admin@info.com',
    password: '123456',
    role: 'admin',
};

// Insert data into DB
const insertData = async () => {
  try {
    await User.create(adminUser);

    console.log('Admin User Inserted'.green.inverse);
    process.exit();
  } catch (error) {
    console.log(error);
  }
};

// Delete data from DB
const destroyData = async () => {
  try {
    await User.deleteOne({ email: adminUser.email });
    console.log('Admin User Destroyed'.red.inverse);
    process.exit();
  } catch (error) {
    console.log(error);
  }
};

// node adminSeeder.js -i
if (process.argv[2] === '-i') {
  insertData();
} else if (process.argv[2] === '-d') {
  destroyData();
}
