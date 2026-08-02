const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { getAuditLogs } = require('../controllers/auditLogController');

router.get('/', protect, authorize('owner'), getAuditLogs);

module.exports = router;
