const mongoose = require('mongoose');

const PropertySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a property name'],
    trim: true
  },
  type: {
    type: String,
    required: [true, 'Please specify property type'],
    enum: ['apartment', 'villa', 'commercial', 'room']
  },
  category: {
    type: String,
    enum: ['Residential', 'Commercial'],
    default: 'Residential'
  },
  floorNumber: {
    type: Number,
    default: 0
  },
  totalFloors: {
    type: Number,
    default: 1
  },
  areaSqFt: {
    type: Number,
    required: [true, 'Please specify property area in sq. ft.']
  },
  carpetAreaSqFt: {
    type: Number,
    default: 0
  },
  builtUpAreaSqFt: {
    type: Number,
    default: 0
  },
  bedrooms: {
    type: Number,
    default: 0
  },
  bathrooms: {
    type: Number,
    default: 0
  },
  balcony: {
    type: Boolean,
    default: false
  },
  balconies: {
    type: Number,
    default: 0
  },
  parkingAvailability: {
    type: Boolean,
    default: false
  },
  parkingType: {
    type: String,
    enum: ['Two-Wheeler', 'Four-Wheeler', 'Both', 'None'],
    default: 'None'
  },
  furnishedStatus: {
    type: String,
    enum: ['furnished', 'semi-furnished', 'unfurnished'],
    required: [true, 'Please specify furnishing status']
  },
  facingDirection: {
    type: String,
    default: 'East'
  },
  propertyAge: {
    type: Number,
    default: 0
  },
  amenities: {
    type: [String],
    default: []
  },
  description: {
    type: String,
    default: ''
  },
  coverPhoto: {
    type: String,
    default: ''
  },
  media: [
    {
      type: {
        type: String,
        enum: ['image', 'video'],
        default: 'image'
      },
      url: {
        type: String,
        required: true
      },
      publicId: {
        type: String,
        default: ''
      },
      originalName: {
        type: String,
        default: ''
      },
      size: {
        type: Number,
        default: 0
      },
      mimeType: {
        type: String,
        default: ''
      },
      isCover: {
        type: Boolean,
        default: false
      },
      order: {
        type: Number,
        default: 0
      },
      uploadedAt: {
        type: Date,
        default: Date.now
      }
    }
  ],
  images: [
    {
      url: String,
      publicId: String
    }
  ],
  videoUrl: {
    type: String,
    default: ''
  },
  monthlyRent: {
    type: Number,
    required: [true, 'Please specify monthly rent']
  },
  securityDeposit: {
    type: Number,
    required: [true, 'Please specify security deposit']
  },
  maintenanceCharges: {
    type: Number,
    default: 0
  },
  electricityCharges: {
    type: Number,
    default: 0
  },
  waterCharges: {
    type: Number,
    default: 0
  },
  availableFromDate: {
    type: Date,
    default: Date.now
  },
  address: {
    houseNumber: { type: String, required: true },
    street: { type: String, required: true },
    area: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    country: { type: String, required: true },
    pincode: { type: String, required: true }
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true
    }
  },
  nearbyFacilities: {
    type: [String],
    default: []
  },
  status: {
    type: String,
    enum: ['Vacant', 'Occupied', 'Reserved', 'Under Maintenance', 'Archived'],
    default: 'Vacant'
  },
  isArchived: {
    type: Boolean,
    default: false
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Owner',
    required: true
  },
  tenant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Setup 2dsphere index for geolocation queries
PropertySchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Property', PropertySchema);
