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

    res.status(204).send();
  });

exports.updateOne = (Model) =>
  asyncHandler(async (req, res, next) => {
    const document = await Model.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!document) {
      return next(new ApiError(`No document for this id ${req.params.id}`, 404));
    }

    res.status(200).json({ data: document });
  });

exports.createOne = (Model) =>
  asyncHandler(async (req, res, next) => {
    // تنظيف الـ body تمامًا من أي حقل مش مسموح في الموديل
    const allowedFields = Object.keys(Model.schema.paths).filter(
      (key) => !key.startsWith("_") && !["__v", "id"].includes(key)
    );

    const cleanedBody = {};
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined && req.body[field] !== null && req.body[field] !== "") {
        cleanedBody[field] = req.body[field];
      }
    });

    // حذف أي حقل name أو title أو slug لو فاضي (مهما كان الموديل)
    delete cleanedBody.name;
    delete cleanedBody.title;
    delete cleanedBody.slug;

    try {
      const doc = await Model.create(cleanedBody);
      res.status(201).json({
        status: "success",
        data: doc,
      });
    } catch (error) {
      if (error.code === 11000) {
        return next(new ApiError("هناك بيانات مكررة أو غير صالحة. تأكد من الكود أو التاريخ.", 400));
      }
      if (error.name === "ValidationError") {
        const messages = Object.values(error.errors).map(err => err.message).join(", ");
        return next(new ApiError(messages, 400));
      }
      next(error);
    }
  });
exports.getOne = (Model, populationOpt) =>
  asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    let query = Model.findById(id);
    if (populationOpt) query = query.populate(populationOpt);

    const document = await query;

    if (!document) {
      return next(new ApiError(`No document for this id ${id}`, 404));
    }

    res.status(200).json({ data: document });
  });

exports.getAll = (Model, modelName = "", populateOptions = []) =>
  asyncHandler(async (req, res, next) => {
    try {
      let filter = req.filterObj || {};
      const documentsCounts = await Model.countDocuments(filter);

      const apiFeatures = new ApiFeatures(Model.find(filter), req.query)
        .paginate(documentsCounts)
        .filter();

      if (populateOptions.length > 0) {
        populateOptions.forEach((option) => {
          apiFeatures.mongooseQuery = apiFeatures.mongooseQuery.populate(option);
        });
      }

      if (modelName) apiFeatures.search(modelName);

      apiFeatures.limitFields().sort();

      const { mongooseQuery, paginationResult } = apiFeatures;
      const documents = await mongooseQuery;

      res.status(200).json({
        results: documents.length,
        paginationResult,
        data: Model.modelName === "User" ? { users: documents } : documents,
      });
    } catch (error) {
      return next(new ApiError(`Error fetching data: ${error.message}`, 500));
    }
  });