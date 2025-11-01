const mongoose = require("mongoose");

const companySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  companyName: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Category",
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  image: {
    type: String, // Path to the uploaded logo image
  },

  country: {
    type: String,
    required: true,
  },
  city: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  whatsapp: {
    type: String,
  },
  facebook: {
    type: String,
  },
  website: {
    type: String,
  },
  isApproved: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const setImageURL = (doc) => {
  if (doc.image && !doc.image.startsWith("http")) {
    const imageUrl = `${process.env.BASE_URL}/brands/${doc.image}`;
    doc.image = imageUrl;
  }
};

// findOne, findAll and update
companySchema.post("init", (doc) => {
  setImageURL(doc);
});

// create
companySchema.post("save", (doc) => {
  setImageURL(doc);
});

module.exports = mongoose.model("Company", companySchema);
