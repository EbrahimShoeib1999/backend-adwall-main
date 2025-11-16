const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  try {
    // 1) Create a transporter
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    // 2) Define the email options
    const mailOpts = {
      from: `Ad-Wall <${process.env.EMAIL_FROM}>`,
      to: options.email,
      subject: options.subject,
      text: options.message,
      html: options.html,
    };

    // 3) Actually send the email
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
      error: err.message, // optional: للاختبار/debug
    };
  }
};

module.exports = sendEmail;
