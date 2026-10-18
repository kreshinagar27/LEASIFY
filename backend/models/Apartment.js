const mongoose = require('mongoose');

const ApartmentSchema = new mongoose.Schema({
  number: { type: String, required: true },
  floor: { type: Number, required: true },
  areaSqFt: { type: Number, required: true },
  bedrooms: { type: Number, default: 0 },
  bathrooms: { type: Number, default: 0 },
  balcony: { type: Boolean, default: false },
  parkingAvailable: { type: Boolean, default: false },
  furnishedStatus: {
    type: String,
    enum: ['furnished', 'semi-furnished', 'unfurnished'],
    default: 'unfurnished'
  },
  monthlyRent: { type: Number, required: true },
  securityDeposit: { type: Number, required: true },
  status: {
    type: String,
    enum: ['Vacant', 'Occupied', 'Reserved', 'Under Maintenance', 'Archived'],
    default: 'Vacant'
  },
  property: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
  coverPhoto: { type: String, default: '' },
  media: [
    {
      type: {
        type: String,
        enum: ['image', 'video'],
        default: 'image'
      },
      url: { type: String, required: true },
      publicId: { type: String, default: '' },
      originalName: { type: String, default: '' },
      size: { type: Number, default: 0 },
      mimeType: { type: String, default: '' },
      isCover: { type: Boolean, default: false },
      order: { type: Number, default: 0 },
      uploadedAt: { type: Date, default: Date.now }
    }
  ],
  images: [{ url: String, publicId: String }],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Apartment', ApartmentSchema);
