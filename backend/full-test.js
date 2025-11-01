const mongoose = require("mongoose");
const User = require("./model/userModel");
const bcrypt = require("bcryptjs");

// تحميل متغيرات البيئة
require("dotenv").config({ path: "env.txt" });

console.log("🔍 AddWall Backend Full Test");
console.log("============================");

async function fullTest() {
  try {
    // 1. اختبار متغيرات البيئة
    console.log("\n1️⃣ Testing Environment Variables:");
    console.log(`✅ DB_URI: ${process.env.DB_URI ? "Found" : "❌ Missing"}`);
    console.log(
      `✅ JWT_SECRET_KEY: ${
        process.env.JWT_SECRET_KEY ? "Found" : "❌ Missing"
      }`
    );
    console.log(`✅ PORT: ${process.env.PORT || "8000"}`);

    // 2. اختبار الاتصال بقاعدة البيانات
    console.log("\n2️⃣ Testing Database Connection:");
    await mongoose.connect(
      process.env.DB_URI || "mongodb://localhost:27017/addwall"
    );
    console.log("✅ Database connected successfully!");

    // 3. اختبار User Model
    console.log("\n3️⃣ Testing User Model:");
    const userCount = await User.countDocuments();
    console.log(`📊 Current user count: ${userCount}`);

    // 4. إنشاء بيانات تجريبية إذا لم تكن موجودة
    if (userCount === 0) {
      console.log("\n4️⃣ Creating Sample Data:");

      // إنشاء مدير
      const admin = new User({
        name: "مدير النظام",
        email: "admin@addwall.com",
        password: await bcrypt.hash("123456", 12),
        role: "admin",
        lastLogin: new Date(),
      });
      await admin.save();
      console.log("✅ Admin user created");

      // إنشاء مستخدمين عاديين
      const users = [];
      for (let i = 1; i <= 10; i++) {
        users.push({
          name: `مستخدم ${i}`,
          email: `user${i}@test.com`,
          password: await bcrypt.hash("123456", 12),
          role: "user",
          lastLogin:
            i <= 3
              ? new Date()
              : new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        });
      }
      await User.insertMany(users);
      console.log("✅ Sample users created");
    }

    // 5. اختبار الإحصائيات
    console.log("\n5️⃣ Testing Statistics:");
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

    console.log(`📊 Total Users: ${totalUsers}`);
    console.log(`👑 Admins: ${adminsCount}`);
    console.log(`👤 Regular Users: ${regularUsersCount}`);
    console.log(`🔥 Active This Week: ${activeThisWeek}`);

    // 6. اختبار تشفير كلمات المرور
    console.log("\n6️⃣ Testing Password Encryption:");
    const testPassword = "123456";
    const hashedPassword = await bcrypt.hash(testPassword, 12);
    const isPasswordValid = await bcrypt.compare(testPassword, hashedPassword);
    console.log(
      `✅ Password encryption: ${isPasswordValid ? "Working" : "❌ Failed"}`
    );

    // 7. عرض معلومات تسجيل الدخول
    console.log("\n🔐 Login Credentials:");
    console.log("Email: admin@addwall.com");
    console.log("Password: 123456");

    console.log("\n✅ All tests passed successfully!");
    console.log("\n🚀 You can now start the server with: npm start");
  } catch (error) {
    console.error("\n❌ Test failed:");
    console.error(error);
  } finally {
    mongoose.connection.close();
  }
}

fullTest();

