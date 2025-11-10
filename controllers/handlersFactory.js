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

    res.status(204).send(); // No content
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
      // تنظيف req.body من الحقول غير الموجودة في السكيما
      const schemaPaths = Object.keys(Model.schema.paths);
      const allowedFields = new Set(schemaPaths);
      const cleanedBody = {};

      for (const key in req.body) {
        if (allowedFields.has(key)) {
          cleanedBody[key] = req.body[key];
        }
      }

      const doc = await Model.create(cleanedBody);

      return res.status(201).json({
        status: "success",
        data: doc,
      });
    } catch (error) {
      // تسجيل الأخطاء للتصحيح
      console.error("Error in createOne:", error.message);
      console.error("Original Request Body:", JSON.stringify(req.body, null, 2));
      console.error("Cleaned Body:", JSON.stringify(cleanedBody ?? {}, null, 2));

      // معالجة خطأ التكرار (Duplicate Key)
      if (error.code === 11000 && error.keyValue) {
        const field = Object.keys(error.keyValue)[0];
        let value = error.keyValue[field];

        // تحسين عرض القيمة
        if (value === null || value === undefined) {
          value = "(empty)";
        } else if (typeof value === "string") {
          value = value.trim();
        }

        // تحسين اسم الحقل للعرض
        const prettyField =
          field === "couponCode"
            ? "coupon code"
            : field === "email"
            ? "email"
            : field === "slug"
            ? "slug"
            : field;

        const message = `${prettyField.charAt(0).toUpperCase() + prettyField.slice(1)} '${value}' is already in use. Please choose another.`;

        return next(new ApiError(message, 400));
      }

      // أخطاء التحقق من الصحة
      if (error.name === "ValidationError") {
        const messages = Object.values(error.errors)
          .map((err) => err.message)
          .join(", ");
        return next(new ApiError(messages, 400));
      }

      // أي خطأ آخر
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
        data:
          Model.modelName === "User"
            ? { users: documents }
            : documents,
      });
    } catch (error) {
      return next(new ApiError(`Error fetching data: ${error.message}`, 500));
    }
  });