import mongoose from "mongoose";

async function checkDatabase() {
  try {
    await mongoose.connect(
      "mongodb+srv://UniqueAdmin:0XAPYWnIWW4S8Aje@uniquefabric.alasprm.mongodb.net/uniquefabric?retryWrites=true&w=majority"
    );

    const db = mongoose.connection.db;
    
    // List all databases
    const adminDb = mongoose.connection.getClient().db('admin');
    const databases = await adminDb.admin().listDatabases();
    console.log("📊 Available databases:");
    databases.databases.forEach(db => {
      console.log(`   - ${db.name} (size: ${db.sizeOnDisk} bytes)`);
    });

    // List collections in current database
    const collections = await db.listCollections().toArray();
    console.log("\n📁 Collections in current database:");
    collections.forEach(collection => {
      console.log(`   - ${collection.name}`);
    });

    // Check if products collection exists and count documents
    if (collections.some(c => c.name === 'products')) {
      const productCount = await db.collection('products').countDocuments();
      console.log(`\n📦 Products count: ${productCount}`);
      
      if (productCount > 0) {
        const sampleProducts = await db.collection('products').find().limit(3).toArray();
        console.log("\n🔍 Sample products:");
        sampleProducts.forEach(product => {
          console.log(`   - ${product.name} (${product.category}): $${product.price}`);
        });
      }
    }

    await mongoose.connection.close();
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

checkDatabase();