const mongoose = require('mongoose');
const Company = require('./companyModel');

const reviewSchema = new mongoose.Schema(
  {
    title: {
      type: String,
    },
    ratings: {
      type: Number,
      min: [1, 'Min ratings value is 1.0'],
      max: [5, 'Max ratings value is 5.0'],
      required: [true, 'Review ratings required'],
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'Review must belong to user'],
    },
    company: {
      type: mongoose.Schema.ObjectId,
      ref: 'Company',
      required: [true, 'Review must belong to a company'],
    },
    approved: {
      type: Boolean,
      default: false, // Reviews need admin approval
    },
  },
  { timestamps: true }
);

reviewSchema.pre(/^find/, function (next) {
  this.populate({ path: 'user', select: 'name profileImg' });
  next();
});

reviewSchema.statics.calcAverageRatingsAndQuantity = async function (
  companyId
) {
  const result = await this.aggregate([
    { $match: { company: companyId, approved: true } },
    {
      $group: {
        _id: 'company',
        avgRatings: { $avg: '$ratings' },
        ratingsQuantity: { $sum: 1 },
      },
    },
  ]);

  if (result.length > 0) {
    await Company.findByIdAndUpdate(companyId, {
      ratingsAverage: result[0].avgRatings,
      ratingsQuantity: result[0].ratingsQuantity,
    });
  } else {
    await Company.findByIdAndUpdate(companyId, {
      ratingsAverage: 0,
      ratingsQuantity: 0,
    });
  }
};

reviewSchema.post('save', async function () {
  await this.constructor.calcAverageRatingsAndQuantity(this.company);
});

reviewSchema.post('remove', async function () {
  await this.constructor.calcAverageRatingsAndQuantity(this.company);
});

module.exports = mongoose.model('Review', reviewSchema);