const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./model/userModel");

// تحميل متغيرات البيئة
require("dotenv").config({ path: "env.txt" });

// الاتصال بقاعدة البيانات
mongoose.connect(process.env.DB_URI || "mongodb://localhost:27017/addwall");

async function createAdmin() {
  try {
    console.log("Creating admin user...");

    // التحقق من وجود مدير
    const existingAdmin = await User.findOne({ email: "admin@addwall.com" });
    if (existingAdmin) {
      console.log("Admin already exists");
      mongoose.connection.close();
      return;
    }

    // إنشاء مدير جديد
    const admin = new User({
      name: "مدير النظام",
      email: "admin@addwall.com",
      password: await bcrypt.hash("123456", 12),
      role: "admin",
      lastLogin: new Date(),
    });

    await admin.save();
    console.log("Admin created successfully!");
    console.log("Email: admin@addwall.com");
    console.log("Password: 123456");

    // إضافة بعض المستخدمين العاديين للاختبار
    const users = [];
    for (let i = 1; i <= 10; i++) {
      users.push({
        name: `مستخدم ${i}`,
        email: `user${i}@test.com`,
        password: await bcrypt.hash("123456", 12),
        role: "user",
        lastLogin:
          i <= 3 ? new Date() : new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 3 نشطين
      });
    }

    await User.insertMany(users);
    console.log(`Created ${users.length} test users`);

    // عرض الإحصائيات
    const totalUsers = await User.countDocuments();
    const adminsCount = await User.countDocuments({ role: "admin" });
    const regularUsersCount = await User.countDocuments({ role: "user" });

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const activeThisWeek = await User.countDocuments({
      $or: [
        { lastLogin: { $gte: sevenDaysAgo } },
        { createdAt: { $gte: sevenDaysAgo } },
      ],
    });

    console.log("\nDatabase Statistics:");
    console.log(`Total users: ${totalUsers}`);
    console.log(`Admins: ${adminsCount}`);
    console.log(`Regular users: ${regularUsersCount}`);
    console.log(`Active this week: ${activeThisWeek}`);

    mongoose.connection.close();
  } catch (error) {
    console.error("Error creating admin:", error);
    mongoose.connection.close();
  }
}

createAdmin();
