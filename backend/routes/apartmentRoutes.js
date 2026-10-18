const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const { createApartment, getApartments, getApartment, updateApartment, deleteApartment } = require('../controllers/apartmentController');

const router = express.Router();

router.route('/')
  .post(protect, authorize('owner'), createApartment)
  .get(protect, authorize('owner'), getApartments);

router.route('/:id')
  .get(protect, authorize('owner'), getApartment)
  .put(protect, authorize('owner'), updateApartment)
  .delete(protect, authorize('owner'), deleteApartment);

module.exports = router;
