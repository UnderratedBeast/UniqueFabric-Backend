import mongoose from "mongoose";
import Product from "../models/Product.js";

const sampleProducts = [
  {
    name: "Classic Cotton Fabric",
    price: 15,
    stock: 120,
    description: "Soft, durable cotton suitable for everyday wear and crafts.",
    category: "Cotton",
    imageUrl: "https://i.pinimg.com/736x/bc/35/df/bc35df4a50989079cf89cbbd6550a9b4.jpg",
    sku: "COT-001"
  },
  {
    name: "Luxury Silk Charmeuse",
    price: 89.99,
    stock: 40,
    description: "Elegant silk charmeuse with smooth drape and glossy finish.",
    category: "Silk",
    imageUrl: "https://i.pinimg.com/1200x/87/ea/b9/87eab982f9c5b4829df04727372f9b8b.jpg",
    sku: "SLK-001"
  },
  {
    name: "Denim Indigo Fabric",
    price: 25,
    stock: 0,
    description: "Heavy-duty indigo denim, perfect for jeans and jackets.",
    category: "Denim",
    imageUrl: "https://i.pinimg.com/1200x/40/a7/22/40a72266dd1dc09f657467ff2b8fd307.jpg",
    sku: "DNM-001"
  },
  {
    name: "Chiffon Sheer Fabric",
    price: 45,
    stock: 25,
    description: "Lightweight, sheer chiffon ideal for gowns and blouses.",
    category: "Chiffon",
    imageUrl: "https://i.pinimg.com/1200x/80/3c/0d/803c0d03b60fda1c834a059ff24ceb40.jpg",
    sku: "CHF-001"
  },
  {
    name: "Wool Tweed Fabric",
    price: 60,
    stock: 10,
    description: "Classic wool tweed fabric for coats and winter wear.",
    category: "Wool",
    imageUrl: "https://i.pinimg.com/1200x/7f/ca/d0/7fcad0dfc8d9216917649f7cce142f3a.jpg",
    sku: "WOL-001"
  }
];

const seedDatabase = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(
      "mongodb+srv://UniqueAdmin:0XAPYWnIWW4S8Aje@uniquefabric.alasprm.mongodb.net/uniquefabric?retryWrites=true&w=majority"
    );
    
    console.log("✅ Connected to MongoDB");

    // Clear existing products
    await Product.deleteMany({});
    console.log("✅ Cleared existing products");

    // Insert sample products
    await Product.insertMany(sampleProducts);
    console.log(`✅ Inserted ${sampleProducts.length} products`);

    // Display inserted products
    const products = await Product.find({});
    console.log("📦 Products in database:", products.length);
    
    products.forEach(product => {
      console.log(`   - ${product.name} (${product.category}): $${product.price}`);
    });

    console.log("🎉 Database seeded successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  }
};

seedDatabase();