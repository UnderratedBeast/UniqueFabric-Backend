// models/ContactMessage.js
import mongoose from "mongoose";

const contactMessageSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  message: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['unread', 'read'],
    default: 'unread'
  }
}, {
  timestamps: true
});

// Add virtual for formatted date
contactMessageSchema.virtual('formattedDate').get(function() {
  return this.createdAt.toISOString().split('T')[0];
});

// Ensure virtual fields are serialized
contactMessageSchema.set('toJSON', {
  virtuals: true
});

export default mongoose.model('ContactMessage', contactMessageSchema);