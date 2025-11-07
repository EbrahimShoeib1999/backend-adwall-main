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
    color: {
      type: String,
      required: [true, "Color required"],
    },
    slug: { type: String, lowercase: true },
    image: String,
    descriptionAr: { type: String, maxlength: 2000 },
    descriptionEn: { type: String, maxlength: 2000 },
    descriptionTr: { type: String, maxlength: 2000 },
    icon: String,
  },
  { timestamps: true }
);

const setImageURL = (doc) => {
  if (doc && doc.image && !doc.image.startsWith("http")) {
    doc.image = `${process.env.BASE_URL}/categories/${doc.image}`;
  }
};

// After fetching from DB
categorySchema.post("init", (doc) => setImageURL(doc));

// After save (create or update)
categorySchema.post("save", (doc) => setImageURL(doc));

// After findOneAndUpdate
categorySchema.post("findOneAndUpdate", function (doc) {
  setImageURL(doc);
});

module.exports = mongoose.model("Category", categorySchema);