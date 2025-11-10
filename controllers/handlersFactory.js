// handlersFactory.js
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
    try {
      // تنظيف صارم: فقط الحقول الموجودة في السكيما
      const schemaKeys = Object.keys(Model.schema.paths)
        .filter((key) => !key.startsWith('_') && key !== 'id');

      const cleanedBody = {};
      schemaKeys.forEach((key) => {
        if (req.body.hasOwnProperty(key)) {
          cleanedBody[key] = req.body[key];
        }
      });

      // تسجيل للتصحيح (يمكن إزالته في الإنتاج)
      console.log(`Creating ${Model.modelName} with cleaned body:`, cleanedBody);

      const doc = await Model.create(cleanedBody);

      return res.status(201).json({
        status: "success",
        data: doc,
      });
    } catch (error) {
      console.error("Error in createOne:", error.message);
      console.error("Original Body:", req.body);

      // خطأ تكرار المفتاح
      if (error.code === 11000 && error.keyValue) {
        const field = Object.keys(error.keyValue)[0];
        const value = error.keyValue[field] ?? "(empty)";
        const prettyField =
          field === "couponCode"
            ? "Coupon code"
            : field === "email"
            ? "Email"
            : field.charAt(0).toUpperCase() + field.slice(1);

        return next(
          new ApiError(`${prettyField} '${value}' is already taken. Please use another value.`, 400)
        );
      }

      // خطأ التحقق من الصحة
      if (error.name === "ValidationError") {
        const messages = Object.values(error.errors)
          .map((err) => err.message)
          .join(", ");
        return next(new ApiError(messages, 400));
      }

      return next(error);
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