// controllers/contactController.js
import ContactMessage from "../models/ContactMessage.js";

// @desc    Submit contact form
// @route   POST /api/contact
// @access  Public
export const submitContactMessage = async (req, res) => {
  try {
    const { name, email, message } = req.body;

    // Validation
    if (!name || !email || !message) {
      return res.status(400).json({
        success: false,
        message: "All fields are required"
      });
    }

    // Create new message
    const contactMessage = new ContactMessage({
      name,
      email,
      message
    });

    const savedMessage = await contactMessage.save();
    console.log("✅ Message saved to database:", savedMessage._id);
    
    res.status(201).json({
      success: true,
      message: "Contact form submitted successfully",
      data: {
        id: savedMessage._id,
        name: savedMessage.name,
        email: savedMessage.email,
        message: savedMessage.message,
        date: savedMessage.formattedDate,
        status: savedMessage.status
      }
    });

  } catch (error) {
    console.error("Contact form submission error:", error);
    res.status(500).json({
      success: false,
      message: "Server error - failed to submit contact form",
      error: error.message
    });
  }
};

// @desc    Get all contact messages
// @route   GET /api/contact
// @access  Admin
export const getContactMessages = async (req, res) => {
  try {
    const messages = await ContactMessage.find()
      .sort({ createdAt: -1 }) // Newest first
      .select('name email message status createdAt formattedDate');

    res.json({
      success: true,
      data: messages,
      count: messages.length
    });

  } catch (error) {
    console.error("Get contact messages error:", error);
    res.status(500).json({
      success: false,
      message: "Server error - failed to fetch contact messages",
      error: error.message
    });
  }
};

// @desc    Get limited messages for dashboard
// @route   GET /api/contact/dashboard
// @access  Admin
export const getDashboardMessages = async (req, res) => {
  try {
    const messages = await ContactMessage.find()
      .sort({ createdAt: -1 }) // Newest first
      .limit(3) // Only 3 messages for dashboard
      .select('name email message status createdAt formattedDate');

    res.json({
      success: true,
      data: messages,
      count: messages.length
    });

  } catch (error) {
    console.error("Get dashboard messages error:", error);
    res.status(500).json({
      success: false,
      message: "Server error - failed to fetch dashboard messages",
      error: error.message
    });
  }
};

// @desc    Mark message as read
// @route   PUT /api/contact/:id/read
// @access  Admin
export const markMessageAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    const message = await ContactMessage.findByIdAndUpdate(
      id,
      { status: 'read' },
      { new: true }
    ).select('name email message status createdAt formattedDate');

    if (!message) {
      return res.status(404).json({
        success: false,
        message: "Message not found"
      });
    }

    res.json({
      success: true,
      message: "Message marked as read",
      data: message
    });

  } catch (error) {
    console.error("Mark message as read error:", error);
    res.status(500).json({
      success: false,
      message: "Server error - failed to update message",
      error: error.message
    });
  }
};

// @desc    Delete contact message
// @route   DELETE /api/contact/:id
// @access  Admin
export const deleteMessage = async (req, res) => {
  try {
    const { id } = req.params;

    const message = await ContactMessage.findByIdAndDelete(id);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: "Message not found"
      });
    }

    res.json({
      success: true,
      message: "Message deleted successfully"
    });

  } catch (error) {
    console.error("Delete message error:", error);
    res.status(500).json({
      success: false,
      message: "Server error - failed to delete message",
      error: error.message
    });
  }
};