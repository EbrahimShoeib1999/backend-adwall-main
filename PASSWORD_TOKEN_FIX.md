# حل مشكلة تحديث كلمة المرور والـ Token

## المشكلة
عند تحديث كلمة المرور، يُطلب من المستخدم تسجيل الدخول مرة أخرى عند محاولة إضافة إعلان أو القيام بأي عملية أخرى.

## السبب
هذا **سلوك أمني صحيح ومقصود**! عند تغيير كلمة المرور:
1. يتم تحديث حقل `passwordChangedAt` في قاعدة البيانات
2. الـ JWT token القديم يصبح غير صالح
3. النظام يرفض الطلبات التي تستخدم الـ token القديم

## الحل ✅

### Backend (تم التنفيذ)
عند استدعاء `PUT /api/v1/users/changeMyPassword`، النظام الآن:
- ✅ يُحدّث كلمة المرور
- ✅ يُنشئ token جديد
- ✅ يُرجع الـ token الجديد في الـ response
- ✅ يُضيف رسالة واضحة تُخبر الـ Frontend بضرورة تحديث الـ token

### Frontend (يجب التنفيذ)
يجب على الـ Frontend:

```javascript
// عند تحديث كلمة المرور
const updatePassword = async (newPassword) => {
  const oldToken = localStorage.getItem('token');
  
  const response = await fetch('http://adwallpro.com/api/v1/users/changeMyPassword', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${oldToken}`
    },
    body: JSON.stringify({ password: newPassword })
  });

  const data = await response.json();

  if (data.status === 'success') {
    // ⚠️ مهم جداً: حفظ الـ token الجديد
    const newToken = data.data.token;
    localStorage.setItem('token', newToken);
    
    console.log('✅ تم تحديث كلمة المرور والـ token بنجاح');
    // الآن يمكن استخدام الـ token الجديد في جميع الطلبات
  }
};
```

## مثال على الـ Response

```json
{
  "status": "success",
  "message": "تم تحديث كلمة المرور بنجاح. يرجى استخدام الـ token الجديد في جميع الطلبات اللاحقة.",
  "data": {
    "data": {
      "_id": "...",
      "name": "...",
      "email": "..."
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "tokenUpdated": true,
    "message": "تم إنشاء token جديد. يجب تحديث الـ token المحفوظ في الـ Frontend."
  }
}
```

## الخطوات المطلوبة

### ✅ Backend (تم)
- [x] تحديث `updateLoggedUserPassword` لإرجاع token جديد
- [x] إضافة رسائل واضحة في الـ response
- [x] إضافة `tokenUpdated: true` flag

### ⚠️ Frontend (مطلوب)
- [ ] تحديث كود تغيير كلمة المرور
- [ ] حفظ الـ token الجديد من الـ response
- [ ] استبدال الـ token القديم في localStorage
- [ ] استخدام الـ token الجديد في الطلبات اللاحقة

## ملاحظات مهمة

1. **هذا سلوك أمني صحيح** - يمنع استخدام tokens قديمة بعد تغيير كلمة المرور
2. **يحمي من Session Hijacking** - إذا سُرق الـ token القديم، لن يعمل بعد تغيير كلمة المرور
3. **يجب على الـ Frontend التعامل معه** - حفظ الـ token الجديد ضروري

## الفرق بين الـ Endpoints

| Endpoint | من يستخدمه | يُرجع token جديد؟ | ملاحظات |
|----------|------------|------------------|---------|
| `PUT /users/changeMyPassword` | المستخدم المسجل | ✅ نعم | لا يحتاج لتسجيل دخول |
| `PUT /users/changePassword/:id` | الأدمن فقط | ❌ لا | المستخدم يجب أن يسجل دخول |

## اختبار الحل

```bash
# 1. تسجيل الدخول
curl -X POST http://adwallpro.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"oldPassword"}'

# احفظ الـ token من الـ response

# 2. تحديث كلمة المرور
curl -X PUT http://adwallpro.com/api/v1/users/changeMyPassword \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer OLD_TOKEN_HERE" \
  -d '{"password":"newPassword123"}'

# احصل على الـ token الجديد من الـ response

# 3. استخدم الـ token الجديد
curl -X POST http://adwallpro.com/api/v1/companies \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer NEW_TOKEN_HERE" \
  -d '{"companyName":"Test Company",...}'
```

## للمزيد من التفاصيل
راجع ملف `PASSWORD_UPDATE_TOKEN_GUIDE.js` للحصول على شرح تفصيلي وأمثلة كود كاملة.
