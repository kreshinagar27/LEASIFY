const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const { propertyMediaUpload } = require('../middleware/upload');
const {
  createApartment,
  getApartments,
  getApartment,
  updateApartment,
  deleteApartment,
  uploadApartmentMedia,
  deleteApartmentMedia,
  setApartmentCoverPhoto
} = require('../controllers/apartmentController');

const router = express.Router();

router.route('/')
  .post(protect, authorize('owner'), createApartment)
  .get(protect, authorize('owner'), getApartments);

// Apartment Media Management Routes
router.route('/:id/media')
  .post(protect, authorize('owner'), propertyMediaUpload.array('media', 15), uploadApartmentMedia);

router.route('/:id/media/:mediaId')
  .delete(protect, authorize('owner'), deleteApartmentMedia);

router.route('/:id/media/:mediaId/cover')
  .patch(protect, authorize('owner'), setApartmentCoverPhoto);

router.route('/:id')
  .get(protect, authorize('owner'), getApartment)
  .put(protect, authorize('owner'), updateApartment)
  .delete(protect, authorize('owner'), deleteApartment);

module.exports = router;
