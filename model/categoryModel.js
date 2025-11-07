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
  console.log('setImageURL called for doc:', doc._id);
  console.log('doc.image before:', doc.image);
  console.log('process.env.BASE_URL:', process.env.BASE_URL);

  if (doc.image && !doc.image.startsWith("http")) {
    const imageUrl = `${process.env.BASE_URL}/categories/${doc.image}`;
    doc.image = imageUrl;
    console.log('doc.image after:', doc.image);
  } else {
    console.log('doc.image not modified (either falsy or already a URL)');
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