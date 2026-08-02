const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  // Check if SMTP is configured
  const isMailConfigured = 
    process.env.EMAIL_HOST && 
    process.env.EMAIL_USER && 
    process.env.EMAIL_PASS;

  if (!isMailConfigured) {
    console.log('\n==================================================');
    console.log(`[SMTP SIMULATOR] Sending Email to: ${options.to}`);
    console.log(`Subject: ${options.subject}`);
    console.log(`Body:\n${options.text || options.html}`);
    console.log('==================================================\n');
    return { message: 'Email simulator handled mail delivery.' };
  }

  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT || 2525,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });

  const message = {
    from: `${process.env.EMAIL_FROM || 'noreply@leasify.com'}`,
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html
  };

  const info = await transporter.sendMail(message);
  console.log(`Email sent successfully: ${info.messageId}`);
  return info;
};

// Onboard Tenant Welcome Email
const sendTenantWelcomeEmail = async (tenant, tempPassword) => {
  const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/login`;
  const subject = 'Welcome to Leasify - Your Tenant Portal Account';
  const html = `
    <h1>Welcome to Leasify, ${tenant.name}!</h1>
    <p>Your landlord has added you to the rental management portal.</p>
    <p>Here are your temporary login details:</p>
    <ul>
      <li><strong>Username/Email:</strong> ${tenant.email}</li>
      <li><strong>Temporary Password:</strong> ${tempPassword}</li>
    </ul>
    <p>Please log in and update your password immediately at <a href="${loginUrl}">${loginUrl}</a>.</p>
    <br/>
    <p>Regards,</p>
    <p>Leasify Admin System</p>
  `;

  return await sendEmail({
    to: tenant.email,
    subject,
    html
  });
};

// Owner Account Email Verification
const sendVerificationEmail = async (owner, token) => {
  const verifyUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email?token=${token}`;
  const subject = 'Leasify - Verify Your Owner Account';
  const html = `
    <h1>Verify Your Email Address</h1>
    <p>Thank you for registering on Leasify. Please verify your email by clicking the link below:</p>
    <p><a href="${verifyUrl}" style="padding: 10px 20px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 5px; display: inline-block;">Verify Account</a></p>
    <p>If you cannot click the button, copy and paste this link in your browser:</p>
    <p>${verifyUrl}</p>
    <br/>
    <p>Regards,</p>
    <p>Leasify Team</p>
  `;

  return await sendEmail({
    to: owner.email,
    subject,
    html
  });
};

// Reset Password Link
const sendPasswordResetEmail = async (user, token) => {
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${token}`;
  const subject = 'Leasify - Password Reset Request';
  const html = `
    <h1>Password Reset Request</h1>
    <p>You requested a password reset. Please click the link below to set a new password:</p>
    <p><a href="${resetUrl}" style="padding: 10px 20px; background-color: #EF4444; color: white; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a></p>
    <p>This link is valid for 10 minutes only.</p>
    <p>If you did not request this, please ignore this email.</p>
    <br/>
    <p>Regards,</p>
    <p>Leasify Team</p>
  `;

  return await sendEmail({
    to: user.email,
    subject,
    html
  });
};

// Rent Reminder Email
const sendRentReminderEmail = async (tenant, bill, daysLeft) => {
  const portalUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/login`;
  const subject = `Leasify - Rent Payment Reminder (${daysLeft === 0 ? 'Due Today' : `Due in ${daysLeft} Days`})`;
  const html = `
    <h1>Rent Payment Reminder</h1>
    <p>Hello ${tenant.name},</p>
    <p>This is a friendly reminder that the rent of <strong>INR ${bill.totalAmount}</strong> for your property is due on <strong>${new Date(bill.dueDate).toLocaleDateString()}</strong>.</p>
    <p>${daysLeft === 0 ? 'Today is the due date. Please complete payment to avoid late fees.' : `Payment is due in ${daysLeft} days.`}</p>
    <p>Log in to your portal to pay online or scan the UPI QR Code: <a href="${portalUrl}">${portalUrl}</a></p>
    <br/>
    <p>Regards,</p>
    <p>Leasify Billing System</p>
  `;

  return await sendEmail({
    to: tenant.email,
    subject,
    html
  });
};

// Lease Expiry Alert
const sendLeaseExpiryReminderEmail = async (tenant, daysLeft) => {
  const subject = `Leasify - Lease Agreement Expiring in ${daysLeft} Days`;
  const html = `
    <h1>Lease Expiry Notice</h1>
    <p>Hello ${tenant.name},</p>
    <p>Your lease agreement is set to expire on <strong>${new Date(tenant.leaseEndDate).toLocaleDateString()}</strong> (in ${daysLeft} days).</p>
    <p>Please contact your landlord to arrange a lease renewal or submit move-out notices.</p>
    <br/>
    <p>Regards,</p>
    <p>Leasify Notification System</p>
  `;

  return await sendEmail({
    to: tenant.email,
    subject,
    html
  });
};

module.exports = {
  sendEmail,
  sendTenantWelcomeEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendRentReminderEmail,
  sendLeaseExpiryReminderEmail
};
