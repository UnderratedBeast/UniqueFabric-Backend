import mongoose from "mongoose"
import bcrypt from "bcryptjs"

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Please add a name"],
    trim: true,
  },
  email: {
    type: String,
    required: [true, "Please add an email"],
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: [true, "Please add a password"],
    minlength: 6,
  },
  isAdmin: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
})

// Encrypt password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    next()
  }
  
  const salt = await bcrypt.genSalt(10)
  this.password = await bcrypt.hash(this.password, salt)
})

// Compare password method
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password)
}

// Create default admin on server start
userSchema.statics.createDefaultAdmin = async function() {
  try {
    const adminExists = await this.findOne({ email: "admin@uniquefabric.com" })
    
    if (!adminExists) {
      await this.create({
        name: "System Administrator",
        email: "admin@uniquefabric.com",
        password: "UniqueAdmin123", // This will be hashed by the pre-save hook
        isAdmin: true
      })
      console.log("✅ Default admin user created successfully")
    } else {
      console.log("ℹ️  Admin user already exists")
    }
  } catch (error) {
    console.error("❌ Error creating default admin:", error.message)
  }
}

export default mongoose.model("User", userSchema)
