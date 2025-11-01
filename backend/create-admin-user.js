const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config({ path: "env.txt" });

// User model
const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  role: { type: String, default: "user" },
  active: { type: Boolean, default: true },
});

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

const User = mongoose.model("User", userSchema);

async function createAdmin() {
  try {
    // Connect to database
    await mongoose.connect(process.env.DB_URI);
    console.log("✅ Connected to database");

    // Check if admin exists
    const existingAdmin = await User.findOne({ email: "admin@example.com" });

    if (existingAdmin) {
      console.log("✅ Admin user already exists");
      console.log("Email:", existingAdmin.email);
      console.log("Role:", existingAdmin.role);
    } else {
      // Create admin user
      const adminUser = await User.create({
        name: "Admin User",
        email: "admin@example.com",
        password: "admin123",
        role: "admin",
      });

      console.log("✅ Admin user created successfully!");
      console.log("Email:", adminUser.email);
      console.log("Password: admin123");
      console.log("Role:", adminUser.role);
    }

    await mongoose.connection.close();
    console.log("✅ Database connection closed");
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

createAdmin();


