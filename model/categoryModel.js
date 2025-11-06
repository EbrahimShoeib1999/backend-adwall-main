const mongoose = require("mongoose");
// 1- Create Schema
const categorySchema = new mongoose.Schema(
  {
    nameAr: {
      type: String,
      required: [true, "Category required"],
      unique: [true, "Category must be unique"],
      minlength: [3, "Too short category name"],
      maxlength: [32, "Too long category name"],
    },
    nameEn: {
      type: String,
      required: [true, "Category required"],
      unique: [true, "Category must be unique"],
      minlength: [3, "Too short category name"],
      maxlength: [32, "Too long category name"],
    },
    color: {
      type: String,
      required: [true, "Color required"],
    },

    slug: {
      type: String,
      lowercase: true,
    },
    image: String,
    descriptionAr: {
      type: String,
      maxlength: [2000, "Too long description"],
    },
    descriptionEn: {
      type: String,
      maxlength: [2000, "Too long description"],
    },
    descriptionTr: {
      type: String,
      maxlength: [2000, "Too long description"],
    },
    icon: {
      type: String,
    },
  },
  { timestamps: true }
);

const setImageURL = (doc) => {
  if (doc.image && !doc.image.startsWith("http")) {
    const imageUrl = `${process.env.BASE_URL}/categories/${doc.image}`;
    doc.image = imageUrl;
  }
};
// findOne, findAll and update
categorySchema.post("init", (doc) => {
  setImageURL(doc);
});

// create
categorySchema.post("save", (doc) => {
  setImageURL(doc);
});

// 2- Create model
const CategoryModel = mongoose.model("Category", categorySchema);

module.exports = CategoryModel;
