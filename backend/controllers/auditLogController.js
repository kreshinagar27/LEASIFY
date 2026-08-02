const AuditLog = require('../models/AuditLog');

// @desc    Get All Audit Logs (Owner Only)
// @route   GET /api/v1/audit-logs
// @access  Private (Owner Only)
exports.getAuditLogs = async (req, res, next) => {
  try {
    const logs = await AuditLog.find({
      user: req.user.id,
      userModel: 'Owner'
    })
    .populate('user', 'name email')
    .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: logs.length,
      data: logs
    });
  } catch (error) {
    next(error);
  }
};
