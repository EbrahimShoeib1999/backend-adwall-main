const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const slugify = require("slugify");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      required: [true, "name required"],
    },
    slug: {
      type: String,
      lowercase: true,
    },
    email: {
      type: String,
      required: [true, "email required"],
      unique: true,
      trim: true,
      lowercase: true,
      validate: {
        validator: function (val) {
          return /^\S+@\S+\.\S+$/.test(val);
        },
        message: "Invalid email format",
      },
    },
    phone: {
      type: String,
      unique: true,
      sparse: true, // Allows multiple null values
    },
    profileImg: {
      type: String,
      default: "default-profile.png",
    },
    googleId: String,
    password: {
      type: String,
      minlength: [6, "Too short password"],
      select: false,
    },
    passwordChangedAt: Date,
    passwordResetCode: String,
    passwordResetExpires: Date,
    passwordResetVerified: Boolean,
    role: {
      type: String,
      enum: ["user", "manager", "admin"],
      default: "user",
    },
    active: {
      type: Boolean,
      default: true,
    },
    lastLogin: {
      type: Date,
      default: Date.now,
    },
    wishlist: [
      {
        type: mongoose.Schema.ObjectId,
        ref: "Product",
      },
    ],
    addresses: {
      type: [
        {
          id: { type: mongoose.Schema.Types.ObjectId },
          alias: String,
          details: String,
          phone: String,
          city: String,
          postalCode: String,
        },
      ],
      default: [],
    },
    subscription: {
      plan: {
        type: mongoose.Schema.ObjectId,
        ref: 'Plan',
      },
      option: {
        type: mongoose.Schema.Types.ObjectId,
      },
      startDate: Date,
      endDate: Date,
      adsUsed: {
        type: Number,
        default: 0,
      },
      isActive: {
        type: Boolean,
        default: false,
      }
    },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

userSchema.pre("save", async function (next) {
  if (this.isModified("name")) {
    this.slug = slugify(this.name, { lower: true });
  }

  if (!this.isModified("password")) return next();

  this.password = await bcrypt.hash(this.password, 12);
  this.passwordChangedAt = Date.now();
  next();
});

// Virtual property for profile image URL
userSchema.virtual('profileImgUrl').get(function() {
  if (this.profileImg) {
    // Assuming 'uploads/users' is the path where user profile images are stored
    return `${process.env.BASE_URL}/uploads/users/${this.profileImg}`;
  }
  return undefined;
});

const User = mongoose.model("User", userSchema);
module.exports = User;