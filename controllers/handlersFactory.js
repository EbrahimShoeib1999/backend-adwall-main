// controllers/handlersFactory.js
const asyncHandler = require("express-async-handler");
const ApiError = require("../utils/apiError");
const ApiFeatures = require("../utils/apiFeatures");

exports.deleteOne = (Model) =>
  asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const document = await Model.findByIdAndDelete(id);

    if (!document) {
      return next(new ApiError(`No document for this id ${id}`, 404));
    }

    document.remove();
    res.status(204).send();
  });

exports.updateOne = (Model) =>
  asyncHandler(async (req, res, next) => {
    const document = await Model.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });

    if (!document) {
      return next(new ApiError(`No document for this id ${req.params.id}`, 404));
    }

    document.save();
    res.status(200).json({ data: document });
  });

exports.createOne = (Model) => {
  return asyncHandler(async (req, res) => {
    const doc = await Model.create(req.body);

    // أضف BASE_URL يدويًا
    if (doc.image && !doc.image.startsWith('http')) {
      doc.image = `${process.env.BASE_URL}/categories/${doc.image}`;
    }

    res.status(201).json({ data: doc });
  });
};

exports.getOne = (Model, populationOpt) =>
  asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    let query = Model.findById(id);
    if (populationOpt) {
      query = query.populate(populationOpt);
    }

    const document = await query;

    if (!document) {
      return next(new ApiError(`No document for this id ${id}`, 404));
    }
    res.status(200).json({ data: document });
  });

exports.getAll = (Model, modelName = "", populateOptions = []) =>
  asyncHandler(async (req, res, next) => {
    try {
      let filter = {};
      if (req.filterObj) {
        filter = req.filterObj;
      }

      const documentsCounts = await Model.countDocuments();
      const apiFeatures = new ApiFeatures(Model.find(filter), req.query)
        .paginate(documentsCounts)
        .filter();

      if (populateOptions.length > 0) {
        populateOptions.forEach(option => {
          apiFeatures.mongooseQuery = apiFeatures.mongooseQuery.populate(option);
        });
      }

      if (modelName) {
        apiFeatures.search(modelName);
      }

      apiFeatures.limitFields().sort();

      const { mongooseQuery, paginationResult } = apiFeatures;
      const documents = await mongooseQuery;

      const responseData =
        Model.modelName === "User" ? { users: documents } : documents;

      res.status(200).json({
        results: documents.length,
        paginationResult,
        data: responseData,
      });
    } catch (error) {
      return next(new ApiError(`خطأ في جلب البيانات: ${error.message}`, 500));
    }
  });