const mongoose = require('mongoose');

const MaintenanceSchema = new mongoose.Schema({
  complaintId: {
    type: String,
    required: true,
    unique: true
  },
  property: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Property',
    required: true
  },
  tenant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true
  },
  category: {
    type: String,
    required: true,
    enum: ['Electrical', 'Water', 'Plumbing', 'Cleaning', 'Internet', 'Security', 'Furniture', 'Others']
  },
  priority: {
    type: String,
    required: true,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  description: {
    type: String,
    required: [true, 'Please add a maintenance request description']
  },
  beforeImages: {
    type: [String],
    default: []
  },
  afterImages: {
    type: [String],
    default: []
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'resolved'],
    default: 'pending'
  },
  assignedWorker: {
    type: String,
    default: ''
  },
  estimatedCost: {
    type: Number,
    default: 0
  },
  resolutionNotes: {
    type: String,
    default: ''
  },
  completionDate: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Maintenance', MaintenanceSchema);
