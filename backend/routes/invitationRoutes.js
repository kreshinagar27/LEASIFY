const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  createInvitation,
  getInvitations,
  getInvitation,
  revokeInvitation,
  resendInvitation,
  validateInvitationToken
} = require('../controllers/invitationController');

// Public validation endpoint for registration flow
router.get('/validate', validateInvitationToken);

// Owner-only invitation management endpoints
router.route('/')
  .post(protect, authorize('owner'), createInvitation)
  .get(protect, authorize('owner'), getInvitations);

router.route('/:id')
  .get(protect, authorize('owner'), getInvitation)
  .delete(protect, authorize('owner'), revokeInvitation);

router.post('/:id/revoke', protect, authorize('owner'), revokeInvitation);
router.post('/:id/resend', protect, authorize('owner'), resendInvitation);

module.exports = router;
