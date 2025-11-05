import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import mongoose from "mongoose";
import productRoutes from "./routes/productRoutes.js";
// import productRoutes from "./routes/productRoutes.js";
import authRoutes from "./routes/userRoutes.js";
import User from "./models/User.js"; // Ensure you only import once


  // Load environment variables
  dotenv.config();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded());

  // Middleware
  app.use(cors());
  app.use(express.json());

// Health check route
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    database:
      mongoose.connection.readyState === 1 ? "Connected" : "Disconnected",
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
      timestamp: new Date().toISOString(),
      status: "OK",
    });
  });

// Function to create default admin if not already present
const createDefaultAdmin = async () => {
  try {
    const adminExists = await User.findOne({ email: "admin@uniquefabric.com" });
    if (!adminExists) {
      const admin = new User({
        email: "admin@uniquefabric.com",
        password: "UniqueAdmin123", // Ensure this is hashed in your User model
        role: "admin", // Assuming you have roles
      });
      await admin.save();
      console.log("✅ Default admin created");
    } else {
      console.log("🔄 Admin already exists");
    }
  } catch (error) {
    console.error("❌ Error creating admin:", error.message);
  }
};

// Connect to MongoDB and start server
const startServer = async () => {
  try {
    // MongoDB connection
    const mongoURI =
      process.env.MONGO_URI ||
      "mongodb+srv://UniqueAdmin:0XAPYWnIWW4S8Aje@uniquefabric.alasprm.mongodb.net/uniquefabric?retryWrites=true&w=majority&appName=UniqueFabric";

    console.log("🔄 Connecting to MongoDB...");
    await mongoose.connect(mongoURI);
    console.log("✅ MongoDB Connected successfully");
    console.log(`📊 Database: ${mongoose.connection.name}`);

    // Create default admin if not present
    await createDefaultAdmin();

    // Start server
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`🔗 API URL: http://localhost:${PORT}`);
      console.log(`📚 Products API: http://localhost:${PORT}/api/products`);
      // console.log(`📚 Users API: http://localhost:${PORT}/api/users`);
      console.log(`❤️ Health check: http://localhost:${PORT}/health`);
      console.log(`🗄️ DB Test: http://localhost:${PORT}/api/test-db`);
      console.log(`👤 Admin Login: admin@uniquefabric.com / UniqueAdmin123`);
    });
  });

  // Database test route
  app.get("/api/test-db", async (req, res) => {
    try {
      const db = mongoose.connection.db;
      const collections = await db.listCollections().toArray();
      res.json({
        database: mongoose.connection.name,
        collections: collections.map((c) => c.name),
        connection: "Successful",
      });
    } catch (error) {
      res.status(500).json({
        error: error.message,
        connection: "Failed",
      });
    }
  });

  // API routes
  app.use("/api/products", productRoutes);
  app.use("/api/auth", authRoutes);
  app.use("/api/orders", orderRoutes);

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({ message: "Route not found" });
  });

  // Error handler
  app.use((err, req, res, next) => {
    console.error("Server error:", err);
    res.status(500).json({
      message: "Internal server error",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  });

  // Function to create default admin if not already present
  const createDefaultAdmin = async () => {
    try {
      const adminExists = await User.findOne({ email: "admin@uniquefabric.com" });
      if (!adminExists) {
        const admin = new User({
          email: "admin@uniquefabric.com",
          password: "UniqueAdmin123", // Ensure this is hashed in your User model
          role: "admin", // Assuming you have roles
        });
        await admin.save();
        console.log("✅ Default admin created");
      } else {
        console.log("🔄 Admin already exists");
      }
    } catch (error) {
      console.error("❌ Error creating admin:", error.message);
    }
  };

  // Connect to MongoDB and start server
  const startServer = async () => {
    try {
      // MongoDB connection
      const mongoURI = process.env.MONGO_URI || "mongodb+srv://UniqueAdmin:0XAPYWnIWW4S8Aje@uniquefabric.alasprm.mongodb.net/uniquefabric?retryWrites=true&w=majority&appName=UniqueFabric";

      console.log("🔄 Connecting to MongoDB...");
      await mongoose.connect(mongoURI);
      console.log("✅ MongoDB Connected successfully");
      console.log(`📊 Database: ${mongoose.connection.name}`);

      // Create default admin if not present
      await createDefaultAdmin();

      // Start server
      const PORT = process.env.PORT || 5000;
      app.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
        console.log(`🔗 API URL: http://localhost:${PORT}`);
        console.log(`📚 Products API: http://localhost:${PORT}/api/products`);
        console.log(`❤️ Health check: http://localhost:${PORT}/health`);  
        console.log(`🗄️ DB Test: http://localhost:${PORT}/api/test-db`);
        console.log(`👤 Admin Login: admin@uniquefabric.com / UniqueAdmin123`);
      });
    } catch (error) {
      console.error("❌ Failed to start server:", error.message);
      process.exit(1);
    }
  };

  // Start the server
  startServer();


