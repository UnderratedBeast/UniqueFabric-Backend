import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema({
  store: {
    name: { type: String, default: 'Unique Fabrics' },
    description: { type: String, default: 'Premium quality fabrics' },
    email: { type: String, default: 'info@uniquefabrics.com' },
    phone: { type: String, default: '' },
    address: { type: String, default: '' },
    logo: { type: String, default: '' },
    website: { type: String, default: '' },
    socialMedia: {
      facebook: { type: String, default: '' },
      instagram: { type: String, default: '' },
      twitter: { type: String, default: '' },
      pinterest: { type: String, default: '' } // Added for footer
    }
  },
  notifications: {
    lowStockAlerts: { type: Boolean, default: true },
    outOfStockAlerts: { type: Boolean, default: true },
    emailNotifications: { type: Boolean, default: true },
    lowStockThreshold: { type: Number, default: 10, min: 1 }
  },
  lastUpdated: { type: Date, default: Date.now }
});

export default mongoose.model('Settings', settingsSchema);