const AuditLog = require('../models/AuditLog');

/**
 * Creates an audit log entry in the database.
 * 
 * @param {string} userId - ID of the user performing the action
 * @param {string} userModel - Type of user ('Owner' or 'Tenant')
 * @param {string} action - Action identifier (e.g. 'Login', 'Property Added')
 * @param {string} description - Readable description of the action
 * @param {object} req - Express request object (optional, for IP/UA logging)
 */
const logActivity = async (userId, userModel, action, description, req = null) => {
  try {
    let ipAddress = '';
    let userAgent = '';

    if (req) {
      ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
      userAgent = req.headers['user-agent'] || '';
    }

    await AuditLog.create({
      user: userId,
      userModel: userModel,
      action: action,
      description: description,
      ipAddress: ipAddress,
      userAgent: userAgent
    });
  } catch (error) {
    console.error('Failed to write audit log:', error.message);
  }
};

module.exports = logActivity;
