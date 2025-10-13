import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    // Basic Information
    name: { 
      type: String, 
      required: [true, "Product name is required"] 
    },
    description: { 
      type: String, 
      default: "" 
    },
    category: { 
      type: String, 
      required: [true, "Category is required"] 
    },
    price: { 
      type: Number, 
      required: [true, "Price is required"],
      min: [0, "Price cannot be negative"]
    },
    stock: { 
      type: Number, 
      required: true, 
      default: 0,
      min: [0, "Stock cannot be negative"]
    },
    
    // Images
    imageUrl: { 
      type: String, 
      default: "/placeholder-fabric.jpg" 
    },
    images: [{ 
      type: String 
    }], // Array for multiple images
    
    // Additional Details
    sku: { 
      type: String 
    },
    color: { 
      type: String 
    },
    texture: { 
      type: String 
    },
    
    // Enhanced Details for Product Page
    features: [{ 
      type: String 
    }],
    suitableFor: [{ 
      type: String 
    }],
    specifications: {
      fabricWeight: { type: String, default: "" },
      width: { type: String, default: "" },
      composition: { type: String, default: "" },
      careInstructions: { type: String, default: "" },
      origin: { type: String, default: "" },
      stretch: { type: String, default: "" },
      opacity: { type: String, default: "" }
    },
    
    // Reviews and Ratings
    rating: { 
      type: Number, 
      default: 4.5,
      min: [0, "Rating cannot be negative"],
      max: [5, "Rating cannot exceed 5"]
    },
    reviews: { 
      type: Number, 
      default: 0 
    },
    
    // Flags
    featured: { 
      type: Boolean, 
      default: false 
    },
    inStock: { 
      type: Boolean, 
      default: true 
    },
    status: {
      type: String,
      enum: ["In Stock", "Out of Stock", "Low Stock"],
      default: "In Stock"
    },
  },
  { 
    timestamps: true 
  }
);

// Auto-update stock status before saving
productSchema.pre("save", function (next) {
  this.inStock = this.stock > 0;
  
  if (this.stock === 0) {
    this.status = "Out of Stock";
  } else if (this.stock <= 10) {
    this.status = "Low Stock";
  } else {
    this.status = "In Stock";
  }
  
  // Ensure images array has at least the main image
  if (this.imageUrl && (!this.images || this.images.length === 0)) {
    this.images = [this.imageUrl];
  }
  
  next();
});

const Product = mongoose.model("Product", productSchema);
export default Product;