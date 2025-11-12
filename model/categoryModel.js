// model/categoryModel.js
const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema(
  {
    nameAr: {
      type: String,
      required: [true, "Category name (Arabic) required"],
      unique: true,
      minlength: [3, "Too short"],
      maxlength: [32, "Too long"],
    },
    nameEn: {
      type: String,
      required: [true, "Category name (English) required"],
      unique: true,
      minlength: [3, "Too short"],
      maxlength: [32, "Too long"],
    },
    descriptionAr: {
      type: String,
    },
    descriptionEn: {
      type: String,
    },
    color: {
      type: String,
      required: [true, "Color required"],
    },
    slug: { type: String, lowercase: true },
    image: Buffer,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Category", categorySchema);