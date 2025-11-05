// import express from "express";
// import {
//   getProducts,
//   getProductById,
//   createProduct,
//   updateProduct,
//   deleteProduct,
// } from "../controllers/productController.js";

// const router = express.Router();

// // Public routes (no authentication yet)
// router.get("/", getProducts);
// router.get("/:id", getProductById);
// router.post("/", createProduct);
// router.put("/:id", updateProduct);
// router.delete("/:id", deleteProduct);

// export default router;

import express from "express";
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  createSampleProducts,
} from "../controllers/productController.js";
import Product from "../models/Product.js";

const router = express.Router();

// Public routes
router.get("/", getProducts);
router.get("/:id", getProductById);

// Admin routes (for product management)
router.post("/", createProduct);
router.put("/:id", updateProduct);
router.delete("/:id", deleteProduct);

// Seed route (temporary - for adding sample data)
router.post("/seed/samples", createSampleProducts);

// for the cart
router.post("/cart", async (req, res) => {
  try {
    const { ids } = req.body;

    // ✅ check if ids exists and is an array
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      console.log("❌ No product IDs provided in request body");
      return res.status(400).json({ error: "No product IDs provided" });
    }

    console.log("🧩 Fetching products with IDs:", ids);

    const products = await Product.find({ _id: { $in: ids } });

    console.log("✅ Found products:", products.length);
    return res.status(200).json(products);
  } catch (err) {
    console.error("💥 Error fetching cart products:", err);
    return res.status(500).json({ error: "Failed to fetch products" });
  }
});

export default router;
