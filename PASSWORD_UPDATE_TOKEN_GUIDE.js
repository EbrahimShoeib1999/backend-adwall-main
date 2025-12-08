/**
 * توثيق: مشكلة تحديث كلمة المرور والـ Token
 * ================================================
 * 
 * المشكلة:
 * --------
 * عندما يقوم المستخدم بتحديث كلمة المرور من خلال `/changeMyPassword`،
 * يتم رفض جميع الطلبات اللاحقة ويُطلب من المستخدم تسجيل الدخول مرة أخرى.
 * 
 * السبب:
 * ------
 * 1. عند تحديث كلمة المرور، يتم تحديث حقل `passwordChangedAt` في قاعدة البيانات
 * 2. الـ JWT token القديم يحتوي على `iat` (issued at) timestamp
 * 3. الـ middleware للحماية (`protect`) يتحقق من أن الـ token تم إنشاؤه قبل تغيير كلمة المرور
 * 4. إذا كان `passwordChangedAt > token.iat`، يتم رفض الطلب
 * 
 * الحل:
 * -----
 * النظام يعمل بشكل صحيح! هذا سلوك أمني مقصود.
 * 
 * عند تحديث كلمة المرور، يتم إرجاع token جديد في الـ response.
 * يجب على الـ Frontend:
 * 1. حفظ الـ token الجديد من الـ response
 * 2. استبدال الـ token القديم بالـ token الجديد في localStorage/sessionStorage
 * 3. استخدام الـ token الجديد في جميع الطلبات اللاحقة
 * 
 * مثال على الـ Response:
 * ---------------------
 * عند استدعاء PUT /api/v1/users/changeMyPassword
 * 
 * Response:
 * {
 *   "status": "success",
 *   "message": "تم تحديث كلمة المرور بنجاح. يرجى استخدام الـ token الجديد في جميع الطلبات اللاحقة.",
 *   "data": {
 *     "data": { ...userData },
 *     "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",  // <-- Token جديد
 *     "tokenUpdated": true,
 *     "message": "تم إنشاء token جديد. يجب تحديث الـ token المحفوظ في الـ Frontend."
 *   }
 * }
 * 
 * كود Frontend المطلوب:
 * ---------------------
 * 
 * // عند تحديث كلمة المرور
 * const updatePassword = async (newPassword) => {
 *   try {
 *     const response = await fetch('http://adwallpro.com/api/v1/users/changeMyPassword', {
 *       method: 'PUT',
 *       headers: {
 *         'Content-Type': 'application/json',
 *         'Authorization': `Bearer ${oldToken}` // استخدام الـ token القديم
 *       },
 *       body: JSON.stringify({ password: newPassword })
 *     });
 * 
 *     const data = await response.json();
 * 
 *     if (data.status === 'success') {
 *       // حفظ الـ token الجديد
 *       const newToken = data.data.token;
 *       localStorage.setItem('token', newToken); // أو sessionStorage
 * 
 *       // الآن يمكن استخدام الـ token الجديد في جميع الطلبات
 *       console.log('تم تحديث كلمة المرور والـ token بنجاح');
 *     }
 *   } catch (error) {
 *     console.error('خطأ في تحديث كلمة المرور:', error);
 *   }
 * };
 * 
 * الفرق بين الـ Endpoints:
 * ------------------------
 * 
 * 1. PUT /api/v1/users/changeMyPassword (للمستخدم المسجل)
 *    - يُستخدم من قبل المستخدم المسجل لتغيير كلمة المرور الخاصة به
 *    - يُرجع token جديد في الـ response
 *    - لا يحتاج المستخدم لتسجيل الدخول مرة أخرى
 * 
 * 2. PUT /api/v1/users/changePassword/:id (للأدمن فقط)
 *    - يُستخدم من قبل الأدمن لتغيير كلمة مرور مستخدم آخر
 *    - لا يُرجع token جديد (لأن الأدمن لا يحتاج token المستخدم الآخر)
 *    - المستخدم الذي تم تغيير كلمة مروره يجب عليه تسجيل الدخول مرة أخرى
 * 
 * التحقق من الـ Token في الـ Middleware:
 * -------------------------------------
 * 
 * في authService.js (السطور 160-165):
 * 
 * if (currentUser.passwordChangedAt) {
 *   const passChangedTimestamp = parseInt(currentUser.passwordChangedAt.getTime() / 1000, 10);
 *   if (passChangedTimestamp > decoded.iat) {
 *     return next(new ApiError("قام المستخدم بتغيير كلمة المرور مؤخراً، يرجى تسجيل الدخول مرة أخرى", 401));
 *   }
 * }
 * 
 * هذا الكود يتحقق من أن الـ token تم إنشاؤه بعد آخر تغيير لكلمة المرور.
 * 
 * الملفات المعدلة:
 * ----------------
 * - controllers/userService.js
 *   - updateLoggedUserPassword (السطر 177-195)
 *   - changeUserPassword (السطر 82-101)
 * 
 * الاختبار:
 * ---------
 * 1. سجل الدخول واحصل على token
 * 2. استخدم الـ token لتحديث كلمة المرور
 * 3. احصل على الـ token الجديد من الـ response
 * 4. استخدم الـ token الجديد في الطلبات اللاحقة
 * 5. تحقق من أن الطلبات تعمل بشكل صحيح
 * 
 * ملاحظات مهمة:
 * -------------
 * - هذا سلوك أمني صحيح ومقصود
 * - يمنع استخدام tokens قديمة بعد تغيير كلمة المرور
 * - يحمي من هجمات Session Hijacking
 * - يجب على الـ Frontend التعامل مع الـ token الجديد بشكل صحيح
 */

// مثال على استخدام الـ API

// 1. تسجيل الدخول
const login = async () => {
  const response = await fetch('http://adwallpro.com/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'user@example.com',
      password: 'oldPassword123'
    })
  });
  const data = await response.json();
  const token = data.data.token;
  localStorage.setItem('token', token);
  return token;
};

// 2. تحديث كلمة المرور
const changePassword = async (oldToken, newPassword) => {
  const response = await fetch('http://adwallpro.com/api/v1/users/changeMyPassword', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${oldToken}`
    },
    body: JSON.stringify({ password: newPassword })
  });
  const data = await response.json();
  
  if (data.status === 'success' && data.data.tokenUpdated) {
    // حفظ الـ token الجديد
    const newToken = data.data.token;
    localStorage.setItem('token', newToken);
    console.log('تم تحديث الـ token بنجاح');
    return newToken;
  }
};

// 3. استخدام الـ token الجديد في الطلبات اللاحقة
const createAd = async (newToken, adData) => {
  const response = await fetch('http://adwallpro.com/api/v1/companies', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${newToken}` // استخدام الـ token الجديد
    },
    body: JSON.stringify(adData)
  });
  const data = await response.json();
  return data;
};
