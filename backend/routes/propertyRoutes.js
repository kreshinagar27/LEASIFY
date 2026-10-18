const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const { propertyMediaUpload } = require('../middleware/upload');
const { protect, authorize } = require('../middleware/auth');
const {
  addProperty,
  getProperties,
  getMyProperty,
  getProperty,
  updateProperty,
  deleteProperty,
  uploadPropertyMedia,
  deletePropertyMedia,
  setCoverPhoto,
  reorderPropertyMedia,
  geocodeAddress,
  reverseGeocodeCoordinates
} = require('../controllers/propertyController');

router.route('/')
  .post(protect, authorize('owner'), upload.array('images', 10), addProperty)
  .get(protect, getProperties);

router.get('/my', protect, getMyProperty);
router.get('/me', protect, getMyProperty);

// Geocoding Proxy Routes
router.get('/geocode', protect, geocodeAddress);
router.get('/reverse-geocode', protect, reverseGeocodeCoordinates);

// Property Media Management Routes
router.route('/:id/media')
  .post(protect, authorize('owner'), propertyMediaUpload.array('media', 15), uploadPropertyMedia);

router.route('/:id/media/reorder')
  .patch(protect, authorize('owner'), reorderPropertyMedia);

router.route('/:id/media/:mediaId')
  .delete(protect, authorize('owner'), deletePropertyMedia);

router.route('/:id/media/:mediaId/cover')
  .patch(protect, authorize('owner'), setCoverPhoto);

router.route('/:id')
  .get(protect, getProperty)
  .put(protect, authorize('owner'), upload.array('images', 10), updateProperty)
  .delete(protect, authorize('owner'), deleteProperty);

module.exports = router;
