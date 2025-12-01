import PaymentMethod from '../models/PaymentMethod.js';

// Enhanced card type detection with BIN ranges
const detectCardType = (number) => {
  const cleaned = number.replace(/\D/g, '');
  
  // Visa: starts with 4
  if (/^4/.test(cleaned)) return 'visa';
  
  // Mastercard: 51-55 or 2221-2720
  if (/^5[1-5]/.test(cleaned) || /^2[2-7][2-9]/.test(cleaned)) return 'mastercard';
  
  // American Express: starts with 34 or 37
  if (/^3[47]/.test(cleaned)) return 'amex';
  
  // Discover: starts with 6011, 622126-622925, 644-649, or 65
  if (/^6011/.test(cleaned) || /^622[1-9]/.test(cleaned) || /^64[4-9]/.test(cleaned) || /^65/.test(cleaned)) return 'discover';
  
  return 'unknown';
};

// Enhanced expiry date validation with strict month validation
const isValidExpiryDate = (month, year) => {
  // Validate month format and range (01-12 ONLY)
  if (!/^(0[1-9]|1[0-2])$/.test(month)) {
    return { isValid: false, message: 'Month must be between 01 and 12' };
  }

  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;
  
  let expiryYear = parseInt(year);
  
  // Handle 2-digit year
  if (year.length === 2) {
    expiryYear = 2000 + expiryYear;
  }
  
  const expiryMonth = parseInt(month);
  
  // Check if card is expired
  if (expiryYear < currentYear) {
    return { isValid: false, message: 'Card has expired' };
  }
  
  if (expiryYear === currentYear && expiryMonth < currentMonth) {
    return { isValid: false, message: 'Card has expired' };
  }
  
  // Check if expiry is too far in the future (max 20 years)
  if (expiryYear > currentYear + 20) {
    return { isValid: false, message: 'Expiry date too far in the future' };
  }
  
  return { isValid: true };
};

// CREATE new payment method with STRICT validation
export const createPaymentMethod = async (req, res) => {
  try {
    console.log('Creating payment method with data:', req.body);
    
    const { cardNumber, cardHolder, expiryDate, cvv, isDefault } = req.body;

    // Check payment method limit (MAX 5)
    const canAddMore = await PaymentMethod.checkUserLimit(req.user._id);
    if (!canAddMore) {
      return res.status(400).json({
        success: false,
        message: 'Payment method limit reached. You can only have up to 5 saved payment methods.'
      });
    }

    // Basic required fields validation
    if (!cardNumber || !cardHolder || !expiryDate || !cvv) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    // STRICT Card number validation - NO ALPHABETS ALLOWED
    const cardValidation = PaymentMethod.validateCardNumber(cardNumber);
    if (!cardValidation.isValid) {
      return res.status(400).json({ 
        success: false, 
        message: cardValidation.message 
      });
    }

    const cleanedCardNumber = cardValidation.cleaned;

    // Parse expiry date (format: MM/YY or MM/YYYY)
    const [expiryMonth, expiryYear] = expiryDate.split('/');
    if (!expiryMonth || !expiryYear) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid expiry date format (use MM/YY)' 
      });
    }

    // STRICT Expiry date validation - MONTH 01-12 ONLY
    const expiryValidation = isValidExpiryDate(expiryMonth, expiryYear);
    if (!expiryValidation.isValid) {
      return res.status(400).json({ 
        success: false, 
        message: expiryValidation.message 
      });
    }

    // Enhanced CVV validation - NO ALPHABETS ALLOWED
    const cleanedCvv = cvv.replace(/\D/g, '');
    if (!/^\d+$/.test(cvv)) {
      return res.status(400).json({ 
        success: false, 
        message: 'CVV can only contain numbers' 
      });
    }

    const cardType = detectCardType(cleanedCardNumber);
    
    // CVV length validation based on card type
    if (cardType === 'amex') {
      if (cleanedCvv.length !== 4) {
        return res.status(400).json({ 
          success: false, 
          message: 'American Express cards require a 4-digit CVV' 
        });
      }
    } else {
      if (cleanedCvv.length !== 3) {
        return res.status(400).json({ 
          success: false, 
          message: 'CVV must be 3 digits' 
        });
      }
    }

    // Validate card holder name - Letters and spaces only
    if (!/^[a-zA-Z\s]+$/.test(cardHolder.trim())) {
      return res.status(400).json({
        success: false,
        message: 'Card holder name can only contain letters and spaces'
      });
    }

    const paymentData = {
      user: req.user._id,
      lastFour: cleanedCardNumber.slice(-4),
      cardHolder: cardHolder.trim(),
      expiryMonth: expiryMonth.padStart(2, '0'),
      expiryYear: expiryYear.length === 2 ? `20${expiryYear}` : expiryYear,
      cardType: cardType,
      isDefault: Boolean(isDefault),
    };

    console.log('Saving payment data:', paymentData);

    // Create payment method
    const paymentMethod = await PaymentMethod.create(paymentData);

    const safePaymentMethod = {
      _id: paymentMethod._id,
      cardHolder: paymentMethod.cardHolder,
      cardType: paymentMethod.cardType,
      lastFour: paymentMethod.lastFour,
      maskedCardNumber: paymentMethod.maskedCardNumber,
      maskedExpiryDate: '••/••',
      expiryDate: paymentMethod.formattedExpiry,
      isDefault: paymentMethod.isDefault,
      cardLogo: paymentMethod.cardLogo,
      createdAt: paymentMethod.createdAt,
      updatedAt: paymentMethod.updatedAt,
    };

    // Get updated count
    const paymentCount = await PaymentMethod.getUserPaymentCount(req.user._id);

    console.log('Payment method created successfully');

    res.status(201).json({
      success: true,
      message: 'Payment method added successfully',
      data: safePaymentMethod,
      metadata: {
        paymentMethodsCount: paymentCount,
        paymentMethodsLimit: 5, // MAX 5
        canAddMore: paymentCount < 5 // MAX 5
      }
    });
  } catch (error) {
    console.error('Create payment method error:', error);
    
    // Handle duplicate key errors
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Payment method already exists',
      });
    }
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed: ' + errors.join(', '),
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error adding payment method: ' + error.message,
    });
  }
};

// GET all payment methods with enhanced data
export const getPaymentMethods = async (req, res) => {
  try {
    const paymentMethods = await PaymentMethod.find({ user: req.user._id })
      .sort({ isDefault: -1, createdAt: -1 })
      .lean();

    const paymentCount = await PaymentMethod.getUserPaymentCount(req.user._id);

    const safePaymentMethods = paymentMethods.map(pm => {
      // Handle missing or invalid expiry fields gracefully
      let expiryDate = '••/••';
      try {
        if (pm.expiryMonth && pm.expiryYear) {
          const shortYear = pm.expiryYear.toString().slice(-2);
          expiryDate = `${pm.expiryMonth}/${shortYear}`;
        }
      } catch (error) {
        console.warn('Error formatting expiry date for payment method:', pm._id, error);
        expiryDate = '••/••';
      }

      // Card logos mapping
      const cardLogos = {
        visa: '🔵',
        mastercard: '🔴',
        amex: '💳',
        discover: '🟡',
        unknown: '💳'
      };

      return {
        _id: pm._id,
        cardHolder: pm.cardHolder || 'Unknown',
        cardType: pm.cardType || 'unknown',
        lastFour: pm.lastFour || '••••',
        maskedCardNumber: `**** **** **** ${pm.lastFour || '••••'}`,
        maskedExpiryDate: '••/••',
        expiryDate: expiryDate,
        isDefault: pm.isDefault || false,
        cardLogo: cardLogos[pm.cardType] || cardLogos.unknown,
        createdAt: pm.createdAt,
        updatedAt: pm.updatedAt,
      };
    });

    res.json({
      success: true,
      count: safePaymentMethods.length,
      data: safePaymentMethods,
      metadata: {
        paymentMethodsCount: paymentCount,
        paymentMethodsLimit: 5, // MAX 5
        canAddMore: paymentCount < 5 // MAX 5
      }
    });
  } catch (error) {
    console.error('Get payment methods error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching payment methods',
    });
  }
};

// GET payment method limits
export const getPaymentLimits = async (req, res) => {
  try {
    const paymentCount = await PaymentMethod.getUserPaymentCount(req.user._id);
    
    res.json({
      success: true,
      data: {
        currentCount: paymentCount,
        limit: 5, // MAX 5
        canAddMore: paymentCount < 5, // MAX 5
        remainingSlots: Math.max(0, 5 - paymentCount) // MAX 5
      }
    });
  } catch (error) {
    console.error('Get payment limits error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching payment limits',
    });
  }
};

// GET single payment method by ID
export const getPaymentMethodById = async (req, res) => {
  try {
    const paymentMethod = await PaymentMethod.findOne({
      _id: req.params.id,
      user: req.user._id,
    }).lean();

    if (!paymentMethod) {
      return res.status(404).json({
        success: false,
        message: 'Payment method not found',
      });
    }

    // Card logos mapping
    const cardLogos = {
      visa: '🔵',
      mastercard: '🔴', 
      amex: '💳',
      discover: '🟡',
      unknown: '💳'
    };

    // Handle missing or invalid expiry fields
    let expiryDate = '••/••';
    try {
      if (paymentMethod.expiryMonth && paymentMethod.expiryYear) {
        const shortYear = paymentMethod.expiryYear.toString().slice(-2);
        expiryDate = `${paymentMethod.expiryMonth}/${shortYear}`;
      }
    } catch (error) {
      console.warn('Error formatting expiry date:', error);
    }

    const safePaymentMethod = {
      _id: paymentMethod._id,
      cardHolder: paymentMethod.cardHolder || 'Unknown',
      cardType: paymentMethod.cardType || 'unknown',
      lastFour: paymentMethod.lastFour || '••••',
      maskedCardNumber: `**** **** **** ${paymentMethod.lastFour || '••••'}`,
      maskedExpiryDate: '••/••',
      expiryDate: expiryDate,
      isDefault: paymentMethod.isDefault || false,
      cardLogo: cardLogos[paymentMethod.cardType] || cardLogos.unknown,
      createdAt: paymentMethod.createdAt,
      updatedAt: paymentMethod.updatedAt,
    };

    res.json({ 
      success: true, 
      data: safePaymentMethod 
    });
  } catch (error) {
    console.error('Get payment method error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching payment method',
    });
  }
};

// UPDATE payment method
export const updatePaymentMethod = async (req, res) => {
  try {
    const paymentMethod = await PaymentMethod.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!paymentMethod) {
      return res.status(404).json({
        success: false,
        message: 'Payment method not found',
      });
    }

    // Only allow updating non-sensitive fields
    const { cardHolder, isDefault } = req.body;

    if (cardHolder) {
      // Validate card holder name - Letters and spaces only
      if (!/^[a-zA-Z\s]+$/.test(cardHolder.trim())) {
        return res.status(400).json({
          success: false,
          message: 'Card holder name can only contain letters and spaces'
        });
      }
      paymentMethod.cardHolder = cardHolder.trim();
    }
    
    if (typeof isDefault !== 'undefined') {
      paymentMethod.isDefault = Boolean(isDefault);
    }

    await paymentMethod.save();

    // Card logos mapping
    const cardLogos = {
      visa: '🔵',
      mastercard: '🔴', 
      amex: '💳',
      discover: '🟡',
      unknown: '💳'
    };

    // Handle missing or invalid expiry fields
    let expiryDate = '••/••';
    try {
      if (paymentMethod.expiryMonth && paymentMethod.expiryYear) {
        const shortYear = paymentMethod.expiryYear.toString().slice(-2);
        expiryDate = `${paymentMethod.expiryMonth}/${shortYear}`;
      }
    } catch (error) {
      console.warn('Error formatting expiry date:', error);
    }

    const safePaymentMethod = {
      _id: paymentMethod._id,
      cardHolder: paymentMethod.cardHolder,
      cardType: paymentMethod.cardType,
      lastFour: paymentMethod.lastFour,
      maskedCardNumber: `**** **** **** ${paymentMethod.lastFour}`,
      maskedExpiryDate: '••/••',
      expiryDate: expiryDate,
      isDefault: paymentMethod.isDefault,
      cardLogo: cardLogos[paymentMethod.cardType] || cardLogos.unknown,
      createdAt: paymentMethod.createdAt,
      updatedAt: paymentMethod.updatedAt,
    };

    res.json({
      success: true,
      message: 'Payment method updated successfully',
      data: safePaymentMethod,
    });
  } catch (error) {
    console.error('Update payment method error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating payment method',
    });
  }
};

// DELETE payment method
export const deletePaymentMethod = async (req, res) => {
  try {
    const paymentMethod = await PaymentMethod.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!paymentMethod) {
      return res.status(404).json({
        success: false,
        message: 'Payment method not found',
      });
    }

    res.json({ 
      success: true, 
      message: 'Payment method deleted successfully' 
    });
  } catch (error) {
    console.error('Delete payment method error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting payment method',
    });
  }
};

// SET default payment method
export const setDefaultPaymentMethod = async (req, res) => {
  try {
    const paymentMethod = await PaymentMethod.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!paymentMethod) {
      return res.status(404).json({
        success: false,
        message: 'Payment method not found',
      });
    }

    if (paymentMethod.isDefault) {
      // Card logos mapping
      const cardLogos = {
        visa: '🔵',
        mastercard: '🔴', 
        amex: '💳',
        discover: '🟡',
        unknown: '💳'
      };

      // Handle missing or invalid expiry fields
      let expiryDate = '••/••';
      try {
        if (paymentMethod.expiryMonth && paymentMethod.expiryYear) {
          const shortYear = paymentMethod.expiryYear.toString().slice(-2);
          expiryDate = `${paymentMethod.expiryMonth}/${shortYear}`;
        }
      } catch (error) {
        console.warn('Error formatting expiry date:', error);
      }

      const safePaymentMethod = {
        _id: paymentMethod._id,
        cardHolder: paymentMethod.cardHolder,
        cardType: paymentMethod.cardType,
        lastFour: paymentMethod.lastFour,
        maskedCardNumber: `**** **** **** ${paymentMethod.lastFour}`,
        maskedExpiryDate: '••/••',
        expiryDate: expiryDate,
        isDefault: paymentMethod.isDefault,
        cardLogo: cardLogos[paymentMethod.cardType] || cardLogos.unknown,
        createdAt: paymentMethod.createdAt,
        updatedAt: paymentMethod.updatedAt,
      };

      return res.json({
        success: true,
        message: 'Payment method is already the default',
        data: safePaymentMethod,
      });
    }

    await PaymentMethod.updateMany(
      { user: req.user._id },
      { $set: { isDefault: false } }
    );

    paymentMethod.isDefault = true;
    await paymentMethod.save();

    // Card logos mapping
    const cardLogos = {
      visa: '🔵',
      mastercard: '🔴', 
      amex: '💳',
      discover: '🟡',
      unknown: '💳'
    };

    // Handle missing or invalid expiry fields
    let expiryDate = '••/••';
    try {
      if (paymentMethod.expiryMonth && paymentMethod.expiryYear) {
        const shortYear = paymentMethod.expiryYear.toString().slice(-2);
        expiryDate = `${paymentMethod.expiryMonth}/${shortYear}`;
      }
    } catch (error) {
      console.warn('Error formatting expiry date:', error);
    }

    const safePaymentMethod = {
      _id: paymentMethod._id,
      cardHolder: paymentMethod.cardHolder,
      cardType: paymentMethod.cardType,
      lastFour: paymentMethod.lastFour,
      maskedCardNumber: `**** **** **** ${paymentMethod.lastFour}`,
      maskedExpiryDate: '••/••',
      expiryDate: expiryDate,
      isDefault: paymentMethod.isDefault,
      cardLogo: cardLogos[paymentMethod.cardType] || cardLogos.unknown,
      createdAt: paymentMethod.createdAt,
      updatedAt: paymentMethod.updatedAt,
    };

    res.json({
      success: true,
      message: 'Default payment method updated successfully',
      data: safePaymentMethod,
    });
  } catch (error) {
    console.error('Set default payment method error:', error);
    res.status(500).json({
      success: false,
      message: 'Error setting default payment method',
    });
  }
};

// GET default payment method
export const getDefaultPaymentMethod = async (req, res) => {
  try {
    const paymentMethod = await PaymentMethod.findOne({
      user: req.user._id,
      isDefault: true,
    }).lean();

    if (!paymentMethod) {
      return res.status(404).json({
        success: false,
        message: 'No default payment method found',
      });
    }

    // Card logos mapping
    const cardLogos = {
      visa: '🔵',
      mastercard: '🔴', 
      amex: '💳',
      discover: '🟡',
      unknown: '💳'
    };

    // Handle missing or invalid expiry fields
    let expiryDate = '••/••';
    try {
      if (paymentMethod.expiryMonth && paymentMethod.expiryYear) {
        const shortYear = paymentMethod.expiryYear.toString().slice(-2);
        expiryDate = `${paymentMethod.expiryMonth}/${shortYear}`;
      }
    } catch (error) {
      console.warn('Error formatting expiry date:', error);
    }

    const safePaymentMethod = {
      _id: paymentMethod._id,
      cardHolder: paymentMethod.cardHolder,
      cardType: paymentMethod.cardType,
      lastFour: paymentMethod.lastFour,
      maskedCardNumber: `**** **** **** ${paymentMethod.lastFour}`,
      maskedExpiryDate: '••/••',
      expiryDate: expiryDate,
      isDefault: paymentMethod.isDefault,
      cardLogo: cardLogos[paymentMethod.cardType] || cardLogos.unknown,
      createdAt: paymentMethod.createdAt,
      updatedAt: paymentMethod.updatedAt,
    };

    res.json({
      success: true,
      data: safePaymentMethod,
    });
  } catch (error) {
    console.error('Get default payment method error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching default payment method',
    });
  }
};