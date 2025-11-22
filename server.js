// import express from "express";
// import dotenv from "dotenv";
// import cors from "cors";
// import mongoose from "mongoose";
// import productRoutes from "./routes/productRoutes.js";
// import authRoutes from "./routes/userRoutes.js";
// import orderRoutes from "./routes/orderRoutes.js"; 
// import User from "./models/User.js";

// // Load environment variables
// dotenv.config();

// const app = express();

// // Middleware
// app.use(cors());
// app.use(express.json());
// app.use(express.urlencoded({ extended: true })); // Added extended: true for better parsing

// // Health check route
// app.get("/health", (req, res) => {
//   res.json({
//     status: "OK",
//     database: mongoose.connection.readyState === 1 ? "Connected" : "Disconnected",
//     timestamp: new Date().toISOString(),
//   });
// });

// // Database test route
// app.get("/api/test-db", async (req, res) => {
//   try {
//     const db = mongoose.connection.db;
//     const collections = await db.listCollections().toArray();
//     res.json({
//       message: "Unique Fabric API is running!",
//       database: mongoose.connection.name,
//       collections: collections.map((c) => c.name),
//       connection: "Successful",
//       timestamp: new Date().toISOString(),
//     });
//   } catch (error) {
//     res.status(500).json({
//       error: error.message,
//       connection: "Failed",
//     });
//   }
// });

// // API Routes
// app.use("/api/products", productRoutes);
// app.use("/api/auth", authRoutes);
// app.use("/api/orders", orderRoutes);

// // 404 Handler
// app.use((req, res) => {
//   res.status(404).json({ message: "Route not found" });
// });

// // Global Error Handler
// app.use((err, req, res, next) => {
//   console.error("Server error:", err);
//   res.status(err.status || 500).json({
//     message: err.message || "Internal server error",
//     error: process.env.NODE_ENV === "development" ? err.stack : undefined,
//   });
// });

// // Function to create default admin if not already present
// const createDefaultAdmin = async () => {
//   try {
//     const adminExists = await User.findOne({ email: "admin@uniquefabric.com" });
//     if (!adminExists) {
//       const admin = new User({
//         email: "admin@uniquefabric.com",
//         password: "UniqueAdmin123", // Must be hashed in User model pre-save hook
//         role: "admin",
//       });
//       await admin.save();
//       console.log("✅ Default admin created: admin@uniquefabric.com");
//     } else {
//       console.log("🔄 Admin already exists");
//     }
//   } catch (error) {
//     console.error("❌ Error creating admin:", error.message);
//   }
// };

// // Connect to MongoDB and start server
// const startServer = async () => {
//   try {
//     const mongoURI =
//       process.env.MONGO_URI ||
//       "mongodb+srv://UniqueAdmin:0XAPYWnIWW4S8Aje@uniquefabric.alasprm.mongodb.net/uniquefabric?retryWrites=true&w=majority&appName=UniqueFabric";

//     console.log("🔄 Connecting to MongoDB...");
//     await mongoose.connect(mongoURI);
//     console.log("✅ MongoDB Connected successfully");
//     console.log(`📊 Database: ${mongoose.connection.name}`);

//     // Create default admin
//     await createDefaultAdmin();

//     // Start server
//     const PORT = process.env.PORT || 5000;
//     app.listen(PORT, () => {
//       console.log(`🚀 Server running on port ${PORT}`);
//       console.log(`🔗 API URL: http://localhost:${PORT}`);
//       console.log(`📚 Products API: http://localhost:${PORT}/api/products`);
//       console.log(`👥 Auth API: http://localhost:${PORT}/api/auth`);
//       console.log(`🛒 Orders API: http://localhost:${PORT}/api/orders`);
//       console.log(`❤️ Health check: http://localhost:${PORT}/health`);
//       console.log(`🗄️ DB Test: http://localhost:${PORT}/api/test-db`);
//       console.log(`👤 Admin Login: admin@uniquefabric.com / UniqueAdmin123`);
//     });
//   } catch (error) {
//     console.error("❌ Failed to start server:", error.message);
//     process.exit(1);
//   }
// };

// // Start the server
// startServer();

import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import mongoose from "mongoose";
import productRoutes from "./routes/productRoutes.js";
import authRoutes from "./routes/userRoutes.js";
import orderRoutes from "./routes/orderRoutes.js"; 
import User from "./models/User.js";
// Add this import at the top with other imports
import contactRoutes from "./routes/contactRoutes.js";


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


// Add this with your other route imports in the API Routes section
app.use("/api/contact", contactRoutes);



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