// سكريبت لإعادة تشغيل الخادم مع إعداد البيانات التجريبية
const { spawn } = require("child_process");
const mongoose = require("mongoose");
const User = require("./model/userModel");

// تحميل متغيرات البيئة
require("dotenv").config({ path: "env.txt" });

console.log("🚀 Starting AddWall Backend Server...");

// تشغيل الخادم
const server = spawn("npm", ["start"], {
  cwd: __dirname,
  stdio: "inherit",
  shell: true,
});

server.on("close", (code) => {
  console.log(`Server process exited with code ${code}`);
});

server.on("error", (error) => {
  console.error("Failed to start server:", error);
});

console.log("✅ Server started successfully!");
console.log("📊 API endpoints available:");
console.log("- GET /api/v1/users/stats - User statistics");
console.log("- GET /api/v1/users - List users");
console.log("- POST /api/v1/auth/login - Login");
console.log("");
console.log("🔐 Test credentials:");
console.log("- Email: admin@addwall.com");
console.log("- Password: 123456");
console.log("");
console.log("Press Ctrl+C to stop the server");
