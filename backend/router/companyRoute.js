const express = require("express");

const uploadLogo = require("../middlewares/uploadImageMiddleware");
const {
  updatecompany,
  deletecompany,
  approveCompany,
  createCompany,
  getCompaniesByCategory,
  getPendingCompanies,
  getallcompany,
  searchCompaniesByName,
  uploadCompanyImage,
  resizeImage,
  searchCompaniesByCategoryAndLocation,
  getUserCompanies,
  getUserCompany,
  getUserCompaniesByStatus,
  getOnecompany,
} = require("../controllers/companyService");
const router = express.Router();
const auth = require("../controllers/authService");
// [الزبون] إرسال طلب اشتراك شركة جديدة (يحتاج موافقة الأدمن)
// @route   POST /api/companies
// @desc    يقوم الزبون بإرسال بيانات شركته ليتم مراجعتها من قبل الأدمن
router.post("/", auth.protect, uploadCompanyImage, resizeImage, createCompany);

router.get("/:id", getOnecompany);
// [الأدمن] جلب جميع الشركات المسجلة (مع إمكانية الفلترة والموافقة)
// @route   GET /api/companies
// @desc    يعرض جميع الشركات (يمكن للأدمن فقط رؤية الشركات غير الموافق عليها)
// ملاحظة: يجب حماية هذا الرابط ليكون للأدمن فقط لاحقاً
// مثال: ?isApproved=false لجلب الشركات التي تنتظر الموافقة

router.get("/", getallcompany);

// البحث عن الشركات بالاسم
router.get("/search", searchCompaniesByName);
// البحث عن الشركات بالمدينة والدولة
//router.get("/search-location", searchCompaniesByLocation);

// جلب الشركات حسب التصنيف
// البحث عن الشركات ضمن الفئة باستخدام المدينة أو الدولة أو كلاهما
router.get(
  "/category/:categoryId/search-location",
  searchCompaniesByCategoryAndLocation
);
router.get("/category/:categoryId", getCompaniesByCategory);

// تحديث شركة
router.put("/", auth.protect, updatecompany);
router.put("/update/:id", auth.protect, updatecompany);
// جلب الشركات غير الموافق عليها (طلبات الاشتراك)

router.get(
  "/pending",
  //   auth.protect,
  //   auth.allowedTo("admin"),
  getPendingCompanies
);

// حذف شركة
router.delete("/delete/:id", auth.protect, deletecompany);

// موافقة الأدمن على إضافة شركة
router.patch(
  "/:id/approve",
  auth.protect,
  auth.allowedTo("admin"),
  approveCompany
);
router.delete(
  "/deletebyadmin/:id",
  auth.protect,
  auth.allowedTo("admin"),
  deletecompany
);

// جلب كل الشركات التابعة لمستخدم معين
router.get("/user/:userId", auth.protect, getUserCompanies);

// جلب شركة معينة تابعة لمستخدم معين
router.get("/user/:userId/company/:companyId", auth.protect, getUserCompany);

// جلب شركات المستخدم حسب الحالة (approved/pending)
router.get(
  "/user/:userId/status/:status",
  auth.protect,
  getUserCompaniesByStatus
);

module.exports = router;
