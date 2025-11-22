// import mongoose from "mongoose";
// import bcrypt from "bcryptjs";

// const userSchema = new mongoose.Schema(
//   {
//     name: {
//       type: String,
//       required: [true, "Please add a name"],
//       trim: true,
//     },
//     email: {
//       type: String,
//       required: [true, "Please add an email"],
//       unique: true,
//       lowercase: true,
//       trim: true,
//     },
//     password: {
//       type: String,
//       required: [true, "Please add a password"],
//       minlength: 6,
//     },
//     phone: {
//       type: String,
//       trim: true,
//     },
//     address: {
//       type: String,
//       trim: true,
//     },
//     city: {
//       type: String,
//       trim: true,
//     },
//     country: {
//       type: String,
//       trim: true,
//     },
//     isAdmin: {
//       type: Boolean,
//       default: false,
//     },
//     resetOTP: { type: String, required: false },
//     otpExpires: Date,
//   },
//   {
//     timestamps: true,
//   }
// );

// // Encrypt password before saving
// userSchema.pre("save", async function (next) {
//   if (!this.isModified("password")) {
//     next();
//   }

//   const salt = await bcrypt.genSalt(10);
//   this.password = await bcrypt.hash(this.password, salt);
// });

// // Compare password method
// userSchema.methods.comparePassword = async function (enteredPassword) {
//   return await bcrypt.compare(enteredPassword, this.password);
// };

// // Create default admin on server start
// userSchema.statics.createDefaultAdmin = async function () {
//   try {
//     const adminExists = await this.findOne({ email: "admin@uniquefabric.com" });

//     if (!adminExists) {
//       await this.create({
//         name: "System Administrator",
//         email: "admin@uniquefabric.com",
//         password: "UniqueAdmin123", // This will be hashed by the pre-save hook
//         isAdmin: true,
//       });
//       console.log("✅ Default admin user created successfully");
//     } else {
//       console.log("ℹ️  Admin user already exists");
//     }
//   } catch (error) {
//     console.error("❌ Error creating default admin:", error.message);
//   }
// };

// export default mongoose.model("User", userSchema);



// models/User.js
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
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
    phone: {
      type: String,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    city: {
      type: String,
      trim: true,
    },
    country: {
      type: String,
      trim: true,
    },
    role: {
      type: String,
      enum: ['customer', 'staff', 'manager', 'admin'],
      default: 'customer',
    },
    isAdmin: {
      type: Boolean,
      default: false,
    },
    resetOTP: { type: String, required: false },
    otpExpires: Date,
  },
  {
    timestamps: true,
  }
);

// Encrypt password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare password method
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Create default users on server start
userSchema.statics.createDefaultUsers = async function () {
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
      const userExists = await this.findOne({ email: userData.email });
      if (!userExists) {
        await this.create(userData);
        console.log(`✅ Created ${userData.role} user: ${userData.email}`);
      } else {
        // Update existing user to ensure role is set
        await this.findOneAndUpdate(
          { email: userData.email },
          { 
            role: userData.role,
            isAdmin: userData.isAdmin,
            name: userData.name 
          }
        );
        console.log(`🔄 Updated ${userData.role} user: ${userData.email}`);
      }
    }
  } catch (error) {
    console.error("❌ Error creating default users:", error.message);
  }
};

export default mongoose.model("User", userSchema);