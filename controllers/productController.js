import mongoose from "mongoose";
import Product from "../models/Product.js";



// @desc    Get all products
// @route   GET /api/products
// @access  Public

export const getProducts = async (req, res) => {
  try {
    const products = await Product.find({});
    res.json(products);
  } catch (error) {
    console.error("Error fetching products:", error);
    res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};


// @desc    Get single product by ID
// @route   GET /api/products/:id
// @access  Public

export const getProductById = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ message: "Invalid product ID format" });
    }

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json(product);
  } catch (error) {
    console.error("Error fetching product by ID:", error);
    res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};

/* ==============================================================
   ADMIN ROUTES
   ============================================================== */


//  @desc    Create new product
//  @route   POST /api/products
//  @access  Admin

export const createProduct = async (req, res) => {
  try {
    const {
      name,
      description,
      category,
      price,
      stock,
      imageUrl,
      images,
      sku,
      color,
      texture,
      features,
      suitableFor,
      specifications,
      rating,
      reviews,
      featured,
    } = req.body;

    const product = new Product({
      name,
      description,
      category,
      price,
      stock: stock ?? 0,
      imageUrl,
      images: images ?? [],
      sku,
      color,
      texture,
      features: features ?? [],
      suitableFor: suitableFor ?? [],
      specifications: specifications ?? {},
      rating: rating ?? 4.5,
      reviews: reviews ?? 0,
      featured: featured ?? false,
    });

    const createdProduct = await product.save();
    res.status(201).json(createdProduct);
  } catch (error) {
    console.error("Error creating product:", error);
    res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};


// @desc    Update product
// @route   PUT /api/products/:id
// @access  Admin
 
export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ message: "Invalid product ID format" });
    }

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Update only fields that are sent
    const updates = req.body;
    Object.keys(updates).forEach((key) => {
      if (updates[key] !== undefined) {
        product[key] = updates[key];
      }
    });

    const updatedProduct = await product.save();
    res.json(updatedProduct);
  } catch (error) {
    console.error("Error updating product:", error);
    res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};

// @desc    Delete product
// @route   DELETE /api/products/:id
// @access  Admin

export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ message: "Invalid product ID format" });
    }

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    await Product.findByIdAndDelete(id);
    res.json({ message: "Product removed successfully" });
  } catch (error) {
    console.error("Error deleting product:", error);
    res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};

/* ==============================================================
   UTILITY / SEED ROUTES
   ============================================================== */

// @desc    Add stock to low-stock products
// @route   PATCH /api/products/add-stock
// @access  Public (temporary)

export const addStockToProducts = async (req, res) => {
  try {
    // Set stock to 50 for any product with <= 10
    const result = await Product.updateMany(
      { stock: { $lte: 10 } },
      { $set: { stock: 50 } }
    );

    const updatedProducts = await Product.find({});

    res.json({
      success: true,
      message: "Stock added to low-stock products",
      modifiedCount: result.modifiedCount,
      products: updatedProducts.map((p) => ({
        name: p.name,
        stock: p.stock,
        status: p.stock > 0 ? "in stock" : "out of stock",
      })),
    });
  } catch (error) {
    console.error("Error adding stock:", error);
    res.status(500).json({
      success: false,
      message: "Error adding stock to products",
      error: error.message,
    });
  }
};


// @desc    Create sample products (seed)
// @route   POST /api/products/seed/samples
// @access  Public (temporary)
 
export const createSampleProducts = async (req, res) => {
  try {
    const sampleProducts = [
      {
        name: "Classic Ankara Fabric - Red & Black",
        price: 28.5,
        stock: 60,
        description:
          "Traditional red and black Ankara print, ideal for dashikis and headwraps.",
        category: "African Prints",
        imageUrl:
          "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=300&fit=crop",
        images: [
          "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=600&h=600&fit=crop",
        ],
        sku: "ANK-002",
        color: "Red & Black",
        texture: "Wax Print",
        features: ["Vibrant colors", "Traditional patterns", "Durable"],
        suitableFor: ["Traditional outfits", "Modern fashion", "Headwraps"],
        specifications: {
          fabricWeight: "5.5 oz/sq yd",
          width: "44 inches",
          composition: "100% Cotton",
          careInstructions: "Machine wash cold, gentle cycle",
          origin: "West Africa",
          stretch: "Minimal",
          opacity: "Opaque",
        },
        rating: 4.7,
        reviews: 15,
        featured: true,
      },
      // Add more samples here if you wish
    ];

    await Product.deleteMany({});
    const createdProducts = await Product.insertMany(sampleProducts);

    res.json({
      message: "Sample products created successfully",
      count: createdProducts.length,
      products: createdProducts,
    });
  } catch (error) {
    console.error("Error creating sample products:", error);
    res.status(500).json({
      message: "Failed to create sample products",
      error: error.message,
    });
  }
};


