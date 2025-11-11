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
    try {
      // تنظيف الـ body: فقط الحقول المسموحة في السكيما
      const schemaKeys = Object.keys(Model.schema.paths)
        .filter((key) => !key.startsWith("_") && key !== "id" && key !== "__v");

      const cleanedBody = {};
      schemaKeys.forEach((key) => {
        if (req.body.hasOwnProperty(key)) {
          cleanedBody[key] = req.body[key];
        }
      });

      // حماية إضافية: حذف أي حقل خطير قد يسبب مشاكل (مثل name فارغ)
      delete cleanedBody.name;
      delete cleanedBody.title;
      delete cleanedBody.client_reference_id;

      const doc = await Model.create(cleanedBody);

      return res.status(201).json({
        status: "success",
        data: doc,
      });
    } catch (error) {
      console.error("CreateOne Error:", error.message);

      // معالجة أخطاء التكرار (Duplicate Key) بشكل ذكي وواضح
      if (error.code === 11000 && error.keyPattern && error.keyValue) {
        const field = Object.keys(error.keyPattern)[0];
        const value = error.keyValue[field];

        let fieldName = field;
        if (field === "couponCode") fieldName = "Coupon code";
        else if (field === "email") fieldName = "Email";
        else if (field === "slug") fieldName = "Slug";
        else if (field === "name") fieldName = "Name";
        else fieldName = field.charAt(0).toUpperCase() + field.slice(1);

        const displayValue =
          value === null || value === undefined || value === ""
            ? "(empty value)"
            : `'${value}'`;

        return next(
          new ApiError(
            `${fieldName} ${displayValue} is already taken. Please choose another value.`,
            400
          )
        );
      }

      // أخطاء التحقق من الصحة (Validation)
      if (error.name === "ValidationError") {
        const messages = Object.values(error.errors)
          .map((err) => err.message)
          .join(", ");
        return next(new ApiError(messages, 400));
      }

      // أي خطأ آخر
      return next(new ApiError(error.message || "Something went wrong while creating the document", 400));
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