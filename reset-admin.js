require('colors');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
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

const resetAdmin = async () => {
  try {
    // Delete admin user if exists
    const deleted = await User.deleteOne({ email: adminUser.email });
    if (deleted.deletedCount > 0) {
        console.log('Previous Admin User Destroyed'.red.inverse);
    } else {
        console.log('No previous admin user to delete.'.yellow.inverse);
    }

    // Create new admin user with hashed password
    const hashedPassword = await bcrypt.hash(adminUser.password, 12);
    await User.create({
        name: adminUser.name,
        email: adminUser.email,
        password: hashedPassword,
        role: adminUser.role,
    });
    console.log('New Admin User Inserted'.green.inverse);

    process.exit();
  } catch (error) {
    console.log(error);
    process.exit(1);
  }
};

resetAdmin();
