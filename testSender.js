require('dotenv').config();
const sendEmail = require('./utils/sendEmail');

sendEmail({
  email: 'ibrahimshoeib255@gmail.com', // حط إيميلك الشخصي للتجربة
  subject: 'Test Email',
  message: ' Hello Eng Khaled Hassan.',
})
  .then(() => console.log('Email sent successfully'))
  .catch(err => console.log('Error sending email:', err));
