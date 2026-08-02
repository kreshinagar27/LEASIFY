const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const { protect, authorize } = require('../middleware/auth');
const {
  addProperty,
  getProperties,
  getMyProperty,
  getProperty,
  updateProperty,
  deleteProperty
} = require('../controllers/propertyController');

router.route('/')
  .post(protect, authorize('owner'), upload.array('images', 10), addProperty)
  .get(protect, authorize('owner'), getProperties);

router.get('/my', protect, getMyProperty);
router.get('/me', protect, getMyProperty);

router.route('/:id')
  .get(protect, getProperty)
  .put(protect, authorize('owner'), upload.array('images', 10), updateProperty)
  .delete(protect, authorize('owner'), deleteProperty);

module.exports = router;
