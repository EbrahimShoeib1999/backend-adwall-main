const mongoose = require("mongoose");
const slugify = require("slugify");

// نموذج الشركة
const companySchema = new mongoose.Schema(
  {
    companyName: {
      type: String,
      required: [true, "يرجى إدخال اسم الشركة"],
      unique: true,
    },
    companyNameEn: {
      type: String,
      required: [true, "Please enter company name"],
    },
    slug: {
      type: String,
      lowercase: true,
    },
    description: {
      type: String,
      required: [true, "يرجى إدخال وصف الشركة"],
    },
    descriptionEn: {
      type: String,
      required: [true, "Please enter company description"],
    },
    logo: Buffer,
    country: {
      type: String,
      required: [true, "يرجى إدخال الدولة"],
    },
    city: {
      type: String,
      required: [true, "يرجى إدخال المدينة"],
    },
    email: {
      type: String,
      required: [true, "يرجى إدخال البريد الإلكتروني"],
    },
    whatsapp: String,
    facebook: String,
    website: String,
    isApproved: {
      type: Boolean,
      default: false, // يتطلب موافقة الأدمن
    },
    adType: {
      type: String,
      enum: ["normal", "vip"],
      default: "normal",
    },
    video: {
      type: String, // URL to the video, managed by admin for VIP ads
    },
    ratingsAverage: {
      type: Number,
      min: [1, "Rating must be above or equal 1.0"],
      max: [5, "Rating must be below or equal 5.0"],
    },
    ratingsQuantity: {
      type: Number,
      default: 0,
    },
    userId: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      required: [true, "يجب أن تنتمي الشركة إلى مستخدم"],
    },
    categoryId: {
      type: mongoose.Schema.ObjectId,
      ref: "Category",
      required: [true, "يجب أن تنتمي الشركة إلى فئة"],
    },
    views: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

companySchema.pre("save", function (next) {
  if (this.isModified("companyName")) {
    this.slug = slugify(this.companyName, { lower: true });
  }
  next();
});

companySchema.virtual("reviews", {
  ref: "Review",
  foreignField: "company",
  localField: "_id",
});

companySchema.pre(/^find/, function (next) {
  this.populate({ path: "categoryId", select: "nameAr nameEn color -_id" });
  next();
});

module.exports = mongoose.model("Company", companySchema);
