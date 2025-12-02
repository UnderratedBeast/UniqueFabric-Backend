import jwt from "jsonwebtoken";
import User from "../models/User.js";

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      // Get token from header
      token = req.headers.authorization.split(" ")[1];

      // Verify token
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || "unique-fabric-secret-key-2024"
      );

      // Get user from the token
      req.user = await User.findById(decoded.userId).select("-password");

      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "User not found",
        });
      }

      next();
    } catch (error) {
      console.error("Token verification error:", error);
      return res.status(401).json({
        success: false,
        message: "Not authorized, token failed",
      });
    }
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Not authorized, no token",
    });
  }
};

// Updated: Role-based access control
const requireRole = (allowedRoles = ["admin"]) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Not authorized",
      });
    }

    const userRole = req.user.role || (req.user.isAdmin ? "admin" : "customer");

    if (allowedRoles.includes(userRole)) {
      next();
    } else {
      res.status(403).json({
        success: false,
        message: `Access denied. Required roles: ${allowedRoles.join(", ")}`,
      });
    }
  };
};

// Keep backward compatibility
const adminOnly = (req, res, next) => {
  requireRole(["admin"])(req, res, next);
};

// Specific role middlewares
const adminOrManager = (req, res, next) => {
  requireRole(["admin", "manager"])(req, res, next);
};

const adminManagerOrStaff = (req, res, next) => {
  requireRole(["admin", "manager", "staff"])(req, res, next);
};

export { protect, adminOnly, requireRole, adminOrManager, adminManagerOrStaff };
