const asyncHandler = require("express-async-handler");
const ApiError = require("../utils/apiError");
const ApiFeatures = require("../utils/apiFeatures");
const { sendSuccessResponse, sendErrorResponse, statusCodes } = require("../utils/responseHandler");

exports.deleteOne = (Model) =>
  asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const document = await Model.findByIdAndDelete(id);

    if (!document) {
      return next(new ApiError(`لا يوجد مستند بهذا المعرف ${id}`, statusCodes.NOT_FOUND));
    }

    sendSuccessResponse(res, statusCodes.NO_CONTENT, 'تم حذف المستند بنجاح');
  });

exports.updateOne = (Model) =>
  asyncHandler(async (req, res, next) => {
    const document = await Model.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!document) {
      return next(new ApiError(`لا يوجد مستند بهذا المعرف ${req.params.id}`, statusCodes.NOT_FOUND));
    }

    sendSuccessResponse(res, statusCodes.OK, 'تم تحديث المستند بنجاح', { data: document });
  });

exports.createOne = (Model) =>
  asyncHandler(async (req, res, next) => {
    try {
      const schemaKeys = Object.keys(Model.schema.paths)
        .filter((key) => !key.startsWith('_') && key !== 'id');

      const cleanedBody = {};

      // Ensure req.body is a valid object
      if (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) {
        schemaKeys.forEach((key) => {
          if (Object.prototype.hasOwnProperty.call(req.body, key)) {
            cleanedBody[key] = req.body[key];
          }

          // Uppercase coupon codes
          if (Model.modelName === 'Coupon' && key === 'couponCode' && req.body[key]) {
            cleanedBody[key] = req.body[key].toUpperCase();
          }
        });
      } else {
        return next(new ApiError('Invalid request body: Expected an object.', statusCodes.BAD_REQUEST));
      }

      console.log(`Creating ${Model.modelName} with cleaned body:`, cleanedBody);

      const doc = await Model.create(cleanedBody);

      sendSuccessResponse(res, statusCodes.CREATED, 'تم إنشاء المستند بنجاح', { data: doc });
    } catch (error) {
      console.error("Error in createOne:", error.message);
      console.error("Original Body:", req.body);

      // Duplicate key handler
      if (error.code === 11000 && error.keyValue) {
        const field = Object.keys(error.keyValue)[0];
        const value = error.keyValue[field] ?? "(empty)";
        const prettyField =
          field === "couponCode"
            ? "كود الكوبون"
            : field === "email"
            ? "البريد الإلكتروني"
            : field.charAt(0).toUpperCase() + field.slice(1);

        if (Model.modelName === 'Coupon' && field === 'couponCode') {
          const existingCoupon = await Model.findOne({ couponCode: value });
          if (existingCoupon && !existingCoupon.isActive) {
            return next(
              new ApiError(
                `كود الكوبون '${value}' موجود بالفعل ولكنه غير نشط. يمكنك إعادة تفعيله أو استخدام كود مختلف.`,
                statusCodes.BAD_REQUEST
              )
            );
          }
        }

        return next(
          new ApiError(`'${value}' ${prettyField} مستخدم بالفعل. يرجى استخدام قيمة أخرى.`, statusCodes.BAD_REQUEST)
        );
      }

      // Validation errors
      if (error.name === "ValidationError") {
        const messages = Object.values(error.errors)
          .map((err) => err.message)
          .join(", ");
        return next(new ApiError(messages, statusCodes.BAD_REQUEST));
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
      return next(new ApiError(`لا يوجد مستند بهذا المعرف ${id}`, statusCodes.NOT_FOUND));
    }

    sendSuccessResponse(res, statusCodes.OK, 'تم جلب المستند بنجاح', { data: document });
  });

exports.getAll = (Model, modelName = "", populateOptions = [], searchFields = []) =>
  asyncHandler(async (req, res, next) => {
    try {
      let filter = req.filterObj || {};

      // Build query
      const apiFeatures = new ApiFeatures(Model.find(filter), req.query);

      // Apply filtering, searching, field limiting, and sorting
      apiFeatures.filter();
      // Use the new search method with provided searchFields
      apiFeatures.search(searchFields);
      apiFeatures.limitFields().sort();

      // Populate options if any (moved here to apply before counting and paginating)
      if (populateOptions.length > 0) {
        populateOptions.forEach((option) => {
          apiFeatures.mongooseQuery = apiFeatures.mongooseQuery.populate(option);
        });
      }

      // Count documents AFTER all filters/searches are applied, but BEFORE pagination
      const documentsCounts = await apiFeatures.mongooseQuery.model.countDocuments(apiFeatures.mongooseQuery._conditions);

      // Apply pagination
      apiFeatures.paginate(documentsCounts);

      // Removed redundant calls to populate, search, limitFields, and sort here.

      const { mongooseQuery, paginationResult } = apiFeatures;
      const documents = await mongooseQuery;

      const responseData = {
        results: documents.length,
        paginationResult,
        data: Model.modelName === "User" ? { users: documents } : documents,
      };

      sendSuccessResponse(res, statusCodes.OK, 'تم جلب المستندات بنجاح', responseData);
    } catch (error) {
      return next(new ApiError(`خطأ في جلب البيانات: ${error.message}`, statusCodes.INTERNAL_SERVER_ERROR));
    }
  });