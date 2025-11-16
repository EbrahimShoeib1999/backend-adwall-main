require('dotenv').config();
const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  try {
    // 1) Create a transporter
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,        // smtp.gmail.com
      port: process.env.EMAIL_PORT,        // 587 أو 465
      secure: process.env.EMAIL_PORT == 465, // true إذا 465، false إذا 587
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,  // App Password لو عندك 2FA
      },
      tls: {
        rejectUnauthorized: false,         // تجاوز مشاكل الشهادة self-signed
      },
    });

    // 2) Define the email options
    const mailOpts = {
      from: `Ad-Wall <${process.env.EMAIL_FROM}>`,
      to: options.email,                  // البريد المستلم
      subject: options.subject,           // عنوان الإيميل
      text: options.message,              // نص الإيميل
      html: options.html,                 // نص HTML لو موجود
    };

    // 3) Send the email
    const info = await transporter.sendMail(mailOpts);
    console.log('Email sent: ', info.messageId);

    return {
      status: 'success',
      message: 'تم إرسال البريد الإلكتروني بنجاح.',
    };
  } catch (err) {
    console.error('Email error: ', err);
    return {
      status: 'error',
      message: 'حدث خطأ أثناء إرسال البريد الإلكتروني. يرجى المحاولة مرة أخرى لاحقًا.',
      error: err.message, // للاختبار/debug
    };
  }
};

module.exports = sendEmail;

// -----------------------
// مثال تجريبي للتأكد من الإرسال
if (require.main === module) {
  sendEmail({
    email: 'Khaledhassan199919@gmail.com',
    subject: 'Test Email',
    message: 'Hello Eng Khaled Hassan.',
  })
    .then(res => console.log(res))
    .catch(err => console.log('Error sending email:', err));
}
