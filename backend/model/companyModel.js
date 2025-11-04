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
    companyNameTr: {
      type: String,
      required: [true, "Lütfen şirket adını girin"],
    },
    slug: {
      type: String,
      lowercase: true,
    },
    description: {
      type: String,
      required: [true, "يرجى إدخال وصف الشركة"],
    },
    descriptionTr: {
      type: String,
      required: [true, "Lütfen şirket açıklamasını girin"],
    },
    logo: {
      type: String,
      required: [true, "يرجى تحميل شعار الشركة"],
    },
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
      default: 0,
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

const setURLs = (doc) => {
  if (doc.logo) {
    const logoUrl = `${process.env.BASE_URL}/brands/${doc.logo}`;
    doc.logo = logoUrl;
  }
  if (doc.video) {
    const videoUrl = `${process.env.BASE_URL}/videos/${doc.video}`;
    doc.video = videoUrl;
  }
};

companySchema.post("init", (doc) => {
  setURLs(doc);
});

companySchema.post("save", (doc) => {
  setURLs(doc);
});

module.exports = mongoose.model("Company", companySchema);
