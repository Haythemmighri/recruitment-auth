require('dotenv').config();
const nodemailer = require('nodemailer');

async function testGmail() {
  console.log('Testing Gmail SMTP...');
  console.log('Host:', process.env.EMAIL_HOST);
  console.log('Port:', process.env.EMAIL_PORT);
  console.log('User:', process.env.EMAIL_USER);

  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT),
    secure: false, // STARTTLS on 587
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  try {
    // 1. Verify connection
    await transporter.verify();
    console.log('✅ SMTP connection OK!');

    // 2. Send test email
    const info = await transporter.sendMail({
      from: `"RecruitAuth Test" <${process.env.EMAIL_FROM}>`,
      to: process.env.EMAIL_USER, // Send to yourself
      subject: '✅ Gmail SMTP is working!',
      text: 'If you received this, Gmail SMTP is configured correctly.',
      html: '<h2>✅ Gmail SMTP is working!</h2><p>Your Node.js backend can now send real emails.</p>',
    });

    console.log('✅ Test email sent! Message ID:', info.messageId);
    console.log('Check your Gmail inbox for the test email.');
  } catch (err) {
    console.error('❌ SMTP Error:', err.message);
    if (err.code === 'EAUTH') {
      console.log('\n💡 Hint: Gmail rejected the password. You need to use an App Password.');
      console.log('   Go to: https://myaccount.google.com/apppasswords');
      console.log('   Create an App Password for "Mail" and paste it in EMAIL_PASS in your .env');
    } else if (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT') {
      console.log('\n💡 Hint: Could not connect to Gmail SMTP. Check your firewall or internet.');
    }
  }
}

testGmail();
