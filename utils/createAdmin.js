const User = require('../model/userModel');

const createAdmin = async () => {
  try {
    const admin = await User.findOne({ role: 'admin' });
    if (!admin) {
      await User.create({
        name: 'admin',
        email: 'admin@example.com',
        password: 'adminpassword',
        role: 'admin',
      });
      console.log('Admin User Created'.green.inverse);
    } else {
      console.log('Admin User already exists'.yellow.inverse);
    }
  } catch (error) {
    console.error('Error creating admin user:', error);
  }
};

module.exports = createAdmin;
