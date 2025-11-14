// import jwt from "jsonwebtoken";
// import User from "../models/User.js";

// const protect = async (req, res, next) => {
//   let token = req.headers.authorization?.split(" ")[1];
//   if (!token) return res.status(401).json({ message: "Not authorized" });

//   try {
//     const decoded = jwt.verify(token, process.env.JWT_SECRET);
//     req.user = await User.findById(decoded.id).select("-password");
//     next();
//   } catch (error) {
//     res.status(401).json({ message: "Token failed" });
//   }
// };

// const adminOnly = (req, res, next) => {
//   if (req.user && req.user.role === "admin") next();
//   else res.status(403).json({ message: "Admin access only" });
// };

// export { protect, adminOnly };

// middlewares/authMiddleware.js
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    try {
      // Get token from header
      token = req.headers.authorization.split(" ")[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || "unique-fabric-secret-key-2024");

      // Get user from the token - FIX: Use decoded.userId instead of decoded.id
      req.user = await User.findById(decoded.userId).select("-password");
      
      if (!req.user) {
        return res.status(401).json({ 
          success: false,
          message: "User not found" 
        });
      }

      next();
    } catch (error) {
      console.error("Token verification error:", error);
      return res.status(401).json({ 
        success: false,
        message: "Not authorized, token failed" 
      });
    }
  }

  if (!token) {
    return res.status(401).json({ 
      success: false,
      message: "Not authorized, no token" 
    });
  }
};

const adminOnly = (req, res, next) => {
  if (req.user && req.user.isAdmin) { // FIX: Use isAdmin instead of role
    next();
  } else {
    res.status(403).json({ 
      success: false,
      message: "Admin access only" 
    });
  }
};

export { protect, adminOnly };