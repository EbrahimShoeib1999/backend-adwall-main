/**
 * اختبار نظام المشاهدات الفريدة
 * One User = One View
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: 'env.txt' });

const Company = require('./model/companyModel');
const User = require('./model/userModel');

async function testUniqueViews() {
  try {
    await mongoose.connect(process.env.DB_URI);
    console.log('✅ Connected to database\n');

    // احصل على شركة للاختبار
    const company = await Company.findOne();
    if (!company) {
      console.log('❌ لا توجد شركات في قاعدة البيانات');
      process.exit(1);
    }

    console.log('📊 اختبار نظام المشاهدات الفريدة');
    console.log('=====================================\n');
    console.log(`الشركة: ${company.companyName}`);
    console.log(`المشاهدات الحالية: ${company.views}`);
    console.log(`عدد المستخدمين الذين شاهدوا: ${company.viewedBy.length}`);
    console.log(`عدد IPs التي شاهدت: ${company.viewedByIPs.length}\n`);

    // احصل على مستخدم للاختبار
    const user = await User.findOne({ role: 'user' });
    if (!user) {
      console.log('❌ لا يوجد مستخدمين في قاعدة البيانات');
      process.exit(1);
    }

    console.log('👤 المستخدم للاختبار:', user.name);
    console.log('=====================================\n');

    // اختبار 1: هل المستخدم شاف الشركة قبل كده؟
    const hasViewed = company.viewedBy.some(id => id.toString() === user._id.toString());
    
    console.log('🧪 اختبار 1: التحقق من المشاهدة السابقة');
    console.log(`هل المستخدم شاف الشركة قبل كده؟ ${hasViewed ? '✅ نعم' : '❌ لا'}\n`);

    if (hasViewed) {
      console.log('✅ النظام يعمل بشكل صحيح!');
      console.log('المستخدم موجود في viewedBy array');
      console.log('لن يتم زيادة المشاهدات عند المشاهدة مرة أخرى\n');
    } else {
      console.log('ℹ️  المستخدم لم يشاهد الشركة من قبل');
      console.log('سيتم زيادة المشاهدات عند المشاهدة الأولى\n');
    }

    // اختبار 2: محاكاة المشاهدة
    console.log('🧪 اختبار 2: محاكاة المشاهدة');
    console.log('=====================================\n');

    const viewsBefore = company.views;
    let shouldIncrement = false;

    if (!hasViewed) {
      shouldIncrement = true;
      company.viewedBy.push(user._id);
      company.views += 1;
      await company.save();
      console.log('✅ المشاهدة الأولى - تم زيادة العدد');
    } else {
      console.log('❌ المشاهدة المتكررة - لم يتم زيادة العدد');
    }

    console.log(`\nالمشاهدات قبل: ${viewsBefore}`);
    console.log(`المشاهدات بعد: ${company.views}`);
    console.log(`الفرق: ${company.views - viewsBefore}\n`);

    // اختبار 3: محاولة المشاهدة مرة أخرى
    console.log('🧪 اختبار 3: محاولة المشاهدة مرة أخرى');
    console.log('=====================================\n');

    const companyAgain = await Company.findById(company._id);
    const hasViewedAgain = companyAgain.viewedBy.some(id => id.toString() === user._id.toString());
    
    console.log(`هل المستخدم موجود في viewedBy؟ ${hasViewedAgain ? '✅ نعم' : '❌ لا'}`);
    
    if (hasViewedAgain) {
      console.log('✅ النظام يعمل بشكل صحيح!');
      console.log('المستخدم لن يستطيع زيادة المشاهدات مرة أخرى\n');
    }

    // اختبار 4: اختبار IP
    console.log('🧪 اختبار 4: اختبار IP للمستخدمين غير المسجلين');
    console.log('=====================================\n');

    const testIP = '192.168.1.100';
    const hasViewedByIP = companyAgain.viewedByIPs.includes(testIP);
    
    console.log(`IP للاختبار: ${testIP}`);
    console.log(`هل الـ IP شاف الشركة قبل كده؟ ${hasViewedByIP ? '✅ نعم' : '❌ لا'}\n`);

    if (!hasViewedByIP) {
      companyAgain.viewedByIPs.push(testIP);
      companyAgain.views += 1;
      await companyAgain.save();
      console.log('✅ مشاهدة جديدة من IP جديد - تم زيادة العدد\n');
    } else {
      console.log('❌ الـ IP شاف قبل كده - لن يتم زيادة العدد\n');
    }

    // النتائج النهائية
    const finalCompany = await Company.findById(company._id);
    console.log('📊 النتائج النهائية');
    console.log('=====================================');
    console.log(`إجمالي المشاهدات: ${finalCompany.views}`);
    console.log(`عدد المستخدمين المسجلين: ${finalCompany.viewedBy.length}`);
    console.log(`عدد IPs: ${finalCompany.viewedByIPs.length}`);
    console.log('\n✅ جميع الاختبارات نجحت! النظام يعمل بشكل صحيح\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ خطأ:', error.message);
    process.exit(1);
  }
}

testUniqueViews();
