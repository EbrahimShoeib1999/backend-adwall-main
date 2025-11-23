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
    image: String, // تغيير من Buffer إلى String
  },
  {
    timestamps: true,
    toJSON: { virtuals: true }, // Add this line
    toObject: { virtuals: true } // Add this line
  }
);

// Virtual populate
categorySchema.virtual('imageUrl').get(function() {
  if (this.image) {
    // Assuming 'uploads/categories' is the path where category images are stored
    // And BASE_URL is set in your environment variables, e.g., http://localhost:8000
    return `${process.env.BASE_URL}/uploads/categories/${this.image}`;
  }
  return undefined;
});


module.exports = mongoose.model("Category", categorySchema);