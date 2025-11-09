const bcrypt = require("bcryptjs");
const User = require("../model/userModel");

// Admin user data
const adminUser = {
    name: 'admin',
    email: process.env.ADMIN_EMAIL || 'admin@example.com',
    password: process.env.ADMIN_PASSWORD || 'adminpassword',
    role: 'admin',
};

// Function to ensure admin user exists
const ensureAdminUser = async () => {
  try {
    const admin = await User.findOne({ email: adminUser.email });
    if (!admin) {
        const hashedPassword = await bcrypt.hash(adminUser.password, 12);
        await User.create({
            name: adminUser.name,
            email: adminUser.email,
            password: hashedPassword,
            role: adminUser.role,
            phone: '0000000000', // Added a default phone number
        });
        console.log('New Admin User Inserted on server startup');
    } else {
        console.log('Admin User already exists, skipping creation');
    }
  } catch (error) {
    console.error('Error ensuring admin user on server startup:', error);
  }
};

module.exports = ensureAdminUser;