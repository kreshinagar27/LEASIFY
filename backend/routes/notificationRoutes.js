const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getNotifications,
  markAsRead,
  markAllRead,
  deleteNotification
} = require('../controllers/notificationController');

router.route('/')
  .get(protect, getNotifications);

router.put('/read-all', protect, markAllRead);

router.route('/:id')
  .put(protect, markAsRead)
  .delete(protect, deleteNotification);

module.exports = router;
