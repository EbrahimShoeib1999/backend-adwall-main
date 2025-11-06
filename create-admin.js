require('colors');
const dotenv = require('dotenv');
const User = require('./model/userModel');
const dbConnection = require('./config/database');

dotenv.config({ path: './.env' });

// connect to DB
dbConnection();

// Admin user data
const adminUser = {
    name: 'admin',
    email: 'admin@example.com',
    password: 'adminpassword',
    role: 'admin',
};

// Insert data into DB
const insertData = async () => {
  try {
    const admin = await User.findOne({ email: adminUser.email });
    if (!admin) {
        await User.create(adminUser);
        console.log('Admin User Inserted'.green.inverse);
    } else {
        console.log('Admin User already exists'.yellow.inverse);
    }
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

// node create-admin.js -i
if (process.argv[2] === '-i') {
  insertData();
} else if (process.argv[2] === '-d') {
  destroyData();
}