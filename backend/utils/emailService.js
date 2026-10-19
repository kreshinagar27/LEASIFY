const nodemailer = require('nodemailer');

/**
 * Creates and returns the appropriate mail transporter.
 * Priority:
 * 1. Gmail SMTP (service: 'gmail') via GMAIL_USER & GMAIL_APP_PASSWORD
 * 2. Generic SMTP (e.g. Mailtrap) via EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS
 * 3. Fallback Simulator (console output for development if unconfigured)
 */
const getMailConfig = () => {
  // 1. Gmail SMTP
  if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
    const cleanAppPassword = process.env.GMAIL_APP_PASSWORD.replace(/\s+/g, '');
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER.trim(),
        pass: cleanAppPassword
      }
    });

    return {
      type: 'gmail',
      transporter,
      from: `"Leasify" <${process.env.GMAIL_USER.trim()}>`
    };
  }

  // 2. Generic / Mailtrap SMTP Fallback
  if (process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    let host = process.env.EMAIL_HOST;
    let port = parseInt(process.env.EMAIL_PORT, 10) || 2525;

    if (host === 'live.smtp.mailtrap.io' && process.env.EMAIL_USER && process.env.EMAIL_USER !== 'api') {
      console.warn('[EmailService] Mailtrap testing credentials detected; routing to sandbox.smtp.mailtrap.io.');
      host = 'sandbox.smtp.mailtrap.io';
      port = 2525;
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    return {
      type: 'smtp',
      transporter,
      from: process.env.EMAIL_FROM || 'noreply@leasify.com'
    };
  }

  // 3. Unconfigured / Simulator
  return null;
};

const sendEmail = async (options) => {
  const mailConfig = getMailConfig();

  if (!mailConfig) {
    console.log('\n==================================================');
    console.log(`[SMTP SIMULATOR] (No Gmail or SMTP credentials configured)`);
    console.log(`To: ${options.to}`);
    console.log(`Subject: ${options.subject}`);
    console.log(`Body:\n${options.text || options.html}`);
    console.log('==================================================\n');
    return {
      simulator: true,
      message: 'Email simulator handled mail delivery in local console.'
    };
  }

  const message = {
    from: mailConfig.from,
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html
  };

  const maxRetries = mailConfig.type === 'gmail' ? 1 : 2;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const info = await mailConfig.transporter.sendMail(message);

      // Verify SMTP accepted the message
      if (info.rejected && info.rejected.length > 0 && (!info.accepted || info.accepted.length === 0)) {
        const rejectError = new Error(`SMTP server rejected delivery to recipient: ${info.rejected.join(', ')}`);
        rejectError.code = 'ESMTPREJECT';
        throw rejectError;
      }

      console.log(`[EmailService] [${mailConfig.type.toUpperCase()}] Message accepted by SMTP for transmission to ${options.to} (MessageId: ${info.messageId}). Note: Final delivery depends on recipient mailbox provider.`);
      return {
        accepted: info.accepted,
        rejected: info.rejected,
        messageId: info.messageId,
        smtpResponse: info.response,
        smtpAccepted: true
      };
    } catch (error) {
      // Diagnostic error handlers
      if (error.code === 'EAUTH' || error.responseCode === 535) {
        console.error(`[EmailService] [GMAIL EAUTH] Authentication failed for ${mailConfig.from}. Verify that 2-Step Verification is ON and your 16-character Google App Password (without spaces) is correct.`);
      } else if (error.code === 'EENVELOPE' || error.code === 'EDNS') {
        console.error(`[EmailService] Recipient address or domain lookup failed for ${options.to}: ${error.message}`);
      } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNECTION') {
        console.error(`[EmailService] Connection to mail server timed out or was refused: ${error.message}`);
      } else {
        const isRateLimit = error.message && error.message.includes('Too many emails per second');
        if (isRateLimit && attempt < maxRetries) {
          console.warn(`[EmailService] Rate limit hit. Retrying in 1.5s (attempt ${attempt + 1}/${maxRetries})...`);
          await new Promise(r => setTimeout(r, 1500));
          continue;
        }
        console.error(`[EmailService] Delivery attempt failed to ${options.to}:`, error.message);
      }

      throw error;
    }
  }
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
