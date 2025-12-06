import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import mongoose from "mongoose";
import productRoutes from "./routes/productRoutes.js";
import authRoutes from "./routes/userRoutes.js";
import orderRoutes from "./routes/orderRoutes.js"; 
import contactRoutes from "./routes/contactRoutes.js";
import recentlyViewedRoutes from "./routes/recentlyViewed.js";
import User from "./models/User.js";
import addressRoutes from "./routes/addressRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import reviewRoutes from './routes/reviewRoutes.js';
// import settingsRoutes from './routes/settingsRoutes.js';
// import adminUserRoutes from './routes/adminUserRoutes.js';


// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check route
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    database: mongoose.connection.readyState === 1 ? "Connected" : "Disconnected",
    timestamp: new Date().toISOString(),
  });
});

// Database test route
app.get("/api/test-db", async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    res.json({
      message: "Unique Fabric API is running!",
      database: mongoose.connection.name,
      collections: collections.map((c) => c.name),
      connection: "Successful",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
      connection: "Failed",
    });
  }
});

// API Routes
app.use("/api/products", productRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/contact", contactRoutes);
app.use('/api/recently-viewed', recentlyViewedRoutes);
app.use("/api/addresses", addressRoutes);
app.use("/api/payments", paymentRoutes);
app.use('/api/reviews', reviewRoutes);
// app.use('/api/settings', settingsRoutes);
// app.use('/api/admin/users', adminUserRoutes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error("Server error:", err);
  res.status(err.status || 500).json({
    message: err.message || "Internal server error",
    error: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
});

// Function to create default users if not already present
const createDefaultUsers = async () => {
  try {
    const defaultUsers = [
      {
        email: "admin@uniquefabric.com",
        password: "UniqueAdmin123",
        name: "System Administrator",
        role: "admin",
        isAdmin: true,
      },
      {
        email: "manager@uniquefabric.com",
        password: "Manager123",
        name: "Store Manager",
        role: "manager",
        isAdmin: false,
      },
      {
        email: "staff@uniquefabric.com",
        password: "Staff123",
        name: "Store Staff",
        role: "staff",
        isAdmin: false,
      }
    ];

    for (const userData of defaultUsers) {
      const userExists = await User.findOne({ email: userData.email });
      if (!userExists) {
        await User.create(userData);
        console.log(`✅ Created ${userData.role} user: ${userData.email}`);
      } else {
        console.log(`ℹ️ ${userData.role} user already exists: ${userData.email}`);
      }
    }
  } catch (error) {
    console.error("❌ Error creating default users:", error.message);
  }
};

// Connect to MongoDB and start server
const startServer = async () => {
  try {
    const mongoURI =
      process.env.MONGO_URI ||
      "mongodb+srv://UniqueAdmin:0XAPYWnIWW4S8Aje@uniquefabric.alasprm.mongodb.net/uniquefabric?retryWrites=true&w=majority&appName=UniqueFabric";

    console.log("🔄 Connecting to MongoDB...");
    await mongoose.connect(mongoURI);
    console.log("✅ MongoDB Connected successfully");
    console.log(`📊 Database: ${mongoose.connection.name}`);

    // Create default users (admin, manager, staff)
    await createDefaultUsers();

    // Start server
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`🔗 API URL: http://localhost:${PORT}`);
      console.log(`📚 Products API: http://localhost:${PORT}/api/products`);
      console.log(`👥 Auth API: http://localhost:${PORT}/api/auth`);
      console.log(`🛒 Orders API: http://localhost:${PORT}/api/orders`);
      console.log(`📞 Contact API: http://localhost:${PORT}/api/contact`);
      console.log(`👀 Recently Viewed API: http://localhost:${PORT}/api/recently-viewed`);
      console.log(`❤️ Health check: http://localhost:${PORT}/health`);
      console.log(`🗄️ DB Test: http://localhost:${PORT}/api/test-db`);
      console.log(`\n👤 Default Users Created:`);
      console.log(`   Admin: admin@uniquefabric.com / UniqueAdmin123`);
      console.log(`   Manager: manager@uniquefabric.com / Manager123`);
      console.log(`   Staff: staff@uniquefabric.com / Staff123`);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error.message);
    process.exit(1);
  }
};

// Start the server
startServer();