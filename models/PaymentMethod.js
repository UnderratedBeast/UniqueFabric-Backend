import mongoose from 'mongoose';

const paymentMethodSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Store only the last 4 digits for security
  lastFour: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        return /^\d{4}$/.test(v);
      },
      message: 'Last four must be exactly 4 digits'
    }
  },
  cardHolder: {
    type: String,
    required: [true, 'Card holder name is required'],
    trim: true,
    maxlength: [50, 'Card holder name cannot exceed 50 characters'],
    validate: {
      validator: function(v) {
        return /^[a-zA-Z\s]+$/.test(v);
      },
      message: 'Card holder name can only contain letters and spaces'
    }
  },
  expiryMonth: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        return /^(0[1-9]|1[0-2])$/.test(v);
      },
      message: 'Expiry month must be between 01 and 12'
    }
  },
  expiryYear: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        const currentYear = new Date().getFullYear();
        const year = parseInt(v);
        return year >= currentYear && year <= currentYear + 20;
      },
      message: 'Expiry year must be valid and not expired'
    }
  },
  cardType: {
    type: String,
    enum: ['visa', 'mastercard', 'amex', 'discover', 'unknown'],
    required: true
  },
  isDefault: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Ensure only one default payment method per user
paymentMethodSchema.pre('save', async function(next) {
  if (this.isDefault && this.isModified('isDefault')) {
    try {
      await mongoose.model('PaymentMethod').updateMany(
        { user: this.user, _id: { $ne: this._id } },
        { $set: { isDefault: false } }
      );
    } catch (error) {
      return next(error);
    }
  }
  next();
});

// Virtual for masked card number
paymentMethodSchema.virtual('maskedCardNumber').get(function() {
  return `**** **** **** ${this.lastFour}`;
});

// Virtual for formatted expiry date
paymentMethodSchema.virtual('formattedExpiry').get(function() {
  return `${this.expiryMonth}/${this.expiryYear.slice(-2)}`;
});

// Virtual for card logo
paymentMethodSchema.virtual('cardLogo').get(function() {
  const logos = {
    visa: '/images/card-logos/visa.svg',
    mastercard: '/images/card-logos/mastercard.svg',
    amex: '/images/card-logos/amex.svg',
    discover: '/images/card-logos/discover.svg',
    unknown: '/images/card-logos/credit-card.svg'
  };
  return logos[this.cardType] || logos.unknown;
});

// Static method to check payment method limit (MAX 5)
paymentMethodSchema.statics.checkUserLimit = async function(userId) {
  const count = await this.countDocuments({ user: userId });
  return count < 5; // MAX 5 payment methods per user
};

// Static method to get user's payment method count
paymentMethodSchema.statics.getUserPaymentCount = async function(userId) {
  return await this.countDocuments({ user: userId });
};

// Static method to validate card number
paymentMethodSchema.statics.validateCardNumber = function(cardNumber) {
  const cleaned = cardNumber.replace(/\D/g, '');
  
  // Check if it's only numbers
  if (!/^\d+$/.test(cleaned)) {
    return { isValid: false, message: 'Card number can only contain numbers' };
  }
  
  // Check length
  if (cleaned.length < 13 || cleaned.length > 19) {
    return { isValid: false, message: 'Card number must be between 13 and 19 digits' };
  }
  
  return { isValid: true, cleaned };
};

export default mongoose.model('PaymentMethod', paymentMethodSchema);