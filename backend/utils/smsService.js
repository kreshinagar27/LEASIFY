// utils/smsService.js
// Placeholder SMS service. Replace with actual provider (e.g., Twilio) as needed.

require('dotenv').config();

const sendSMS = async (to, message) => {
  // In development, just log the SMS payload.
  console.log(`[SMS] To: ${to}, Message: ${message}`);
  // If a real provider is configured, integrate here.
  // Example (pseudo-code):
  // const client = new Twilio(process.env.SMS_ACCOUNT_SID, process.env.SMS_AUTH_TOKEN);
  // await client.messages.create({ body: message, from: process.env.SMS_FROM_NUMBER, to });
  return true;
};

module.exports = { sendSMS };
