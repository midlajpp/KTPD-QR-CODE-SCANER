import jwt from 'jsonwebtoken';
import Admin from '../models/Admin.js';

export const protectAdmin = async (req, res, next) => {
  try {
    let token = null;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.headers && req.headers['x-access-token']) {
      token = req.headers['x-access-token'];
    } else if (req.query && req.query.token) {
      token = req.query.token;
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. No token provided.'
      });
    }

    const secret = process.env.JWT_SECRET || 'ktpd-fallback-jwt-secret-key-change-in-production';
    
    let decoded;
    try {
      decoded = jwt.verify(token, secret);
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired authentication token.'
      });
    }

    const admin = await Admin.findById(decoded.id).select('-passwordHash');
    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Admin account not found.'
      });
    }

    if (admin.status === 'inactive') {
      return res.status(403).json({
        success: false,
        message: 'Account has been deactivated. Please contact Super Administrator.'
      });
    }

    req.admin = admin;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Role-Based Access Control (RBAC) middleware
 * Verifies that the authenticated admin belongs to one of the allowed roles
 */
export const requireRole = (allowedRoles = []) => {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  const normalizedAllowed = roles.map((r) => r.toLowerCase().replace(/_/g, ''));
  return (req, res, next) => {
    if (!req.admin) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.'
      });
    }

    const currentRole = (req.admin.role || '').toLowerCase().replace(/_/g, '');
    if (roles.length > 0 && !normalizedAllowed.includes(currentRole)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Role '${req.admin.role}' does not have sufficient permissions for this action.`
      });
    }

    next();
  };
};

/**
 * Super Admin-only middleware guard
 */
export const requireSuperAdmin = requireRole(['superadmin', 'SUPER_ADMIN']);

