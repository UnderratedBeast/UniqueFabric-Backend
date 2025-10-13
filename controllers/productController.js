import Product from "../models/Product.js";

// @desc    Get all products
// @route   GET /api/products
// @access  Public
export const getProducts = async (req, res) => {
  try {
    const products = await Product.find({});
    res.json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Get single product by ID
// @route   GET /api/products/:id
// @access  Public
export const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    res.json(product);
  } catch (error) {
    console.error('Error fetching product by ID:', error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Create new product
// @route   POST /api/products
// @access  Admin
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
      featured
    } = req.body;

    const product = new Product({
      name,
      description,
      category,
      price,
      stock: stock || 0,
      imageUrl,
      images: images || [],
      sku,
      color,
      texture,
      features: features || [],
      suitableFor: suitableFor || [],
      specifications: specifications || {},
      rating: rating || 4.5,
      reviews: reviews || 0,
      featured: featured || false
    });

    const createdProduct = await product.save();
    res.status(201).json(createdProduct);
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Update product
// @route   PUT /api/products/:id
// @access  Admin
export const updateProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

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
      featured
    } = req.body;

    // Update basic fields
    product.name = name || product.name;
    product.description = description || product.description;
    product.category = category || product.category;
    product.price = price || product.price;
    product.stock = stock !== undefined ? stock : product.stock;
    product.imageUrl = imageUrl || product.imageUrl;
    product.images = images || product.images;
    product.sku = sku || product.sku;
    product.color = color || product.color;
    product.texture = texture || product.texture;
    product.features = features || product.features;
    product.suitableFor = suitableFor || product.suitableFor;
    product.rating = rating || product.rating;
    product.reviews = reviews || product.reviews;
    product.featured = featured !== undefined ? featured : product.featured;

    // Update specifications (merge with existing)
    if (specifications) {
      product.specifications = {
        ...product.specifications,
        ...specifications
      };
    }

    const updatedProduct = await product.save();
    res.json(updatedProduct);
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Delete product
// @route   DELETE /api/products/:id
// @access  Admin
export const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: "Product removed successfully" });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Create sample products
// @route   POST /api/products/seed/samples
// @access  Public (temporary)
export const createSampleProducts = async (req, res) => {
  try {
    const sampleProducts = [
      {
        name: "Classic Ankara Fabric - Red & Black",
        price: 28.50,
        stock: 60,
        description: "Traditional red and black Ankara print, ideal for dashikis and headwraps.",
        category: "African Prints",
        imageUrl: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=300&fit=crop",
        images: [
          "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=600&h=600&fit=crop"
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
          opacity: "Opaque"
        },
        rating: 4.7,
        reviews: 15,
        featured: true
      }
    ];

    // Clear existing and insert new
    await Product.deleteMany({});
    const createdProducts = await Product.insertMany(sampleProducts);
    
    res.json({
      message: "Sample products created successfully",
      count: createdProducts.length,
      products: createdProducts
    });
  } catch (error) {
    console.error('❌ Error creating sample products:', error);
    res.status(500).json({ 
      message: "Failed to create sample products", 
      error: error.message 
    });
  }
};