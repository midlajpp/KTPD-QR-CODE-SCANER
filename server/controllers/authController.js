import jwt from 'jsonwebtoken';
import Admin from '../models/Admin.js';
import AuditLog from '../models/AuditLog.js';

const generateToken = (id) => {
  const secret = process.env.JWT_SECRET || 'ktpd-fallback-jwt-secret-key-change-in-production';
  return jwt.sign({ id }, secret, {
    expiresIn: '7d'
  });
};

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate admin and get JWT token
 * @access  Public
 */
export const login = async (req, res, next) => {
  try {
    const { usernameOrEmail, password } = req.body;

    if (!usernameOrEmail || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both username/email and password.'
      });
    }

    const cleanIdentifier = usernameOrEmail.trim().toLowerCase();

    // Find admin by username or email (explicitly selecting passwordHash)
    const admin = await Admin.findOne({
      $or: [{ username: cleanIdentifier }, { email: cleanIdentifier }]
    }).select('+passwordHash');

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials.'
      });
    }

    // Check account status
    if (admin.status === 'inactive') {
      return res.status(403).json({
        success: false,
        message: 'Account has been deactivated. Please contact Super Administrator.'
      });
    }

    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials.'
      });
    }

    // Update lastLogin
    admin.lastLogin = new Date();
    await admin.save();

    // Log admin login
    await AuditLog.create({
      action: 'ADMIN_LOGIN',
      performedBy: admin.username,
      details: { email: admin.email },
      ipAddress: req.ip || req.headers['x-forwarded-for'] || ''
    });

    const token = generateToken(admin._id);

    res.json({
      success: true,
      message: 'Login successful',
      token,
      admin: {
        id: admin._id,
        username: admin.username,
        email: admin.email,
        fullName: admin.fullName || '',
        role: admin.role,
        status: admin.status || 'active',
        lastLogin: admin.lastLogin
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/auth/logout
 * @desc    Admin logout
 * @access  Private
 */
export const logout = async (req, res, next) => {
  try {
    if (req.admin) {
      await AuditLog.create({
        action: 'ADMIN_LOGOUT',
        performedBy: req.admin.username,
        ipAddress: req.ip || req.headers['x-forwarded-for'] || ''
      });
    }

    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/auth/me
 * @desc    Get currently authenticated admin
 * @access  Private
 */
export const getMe = async (req, res, next) => {
  try {
    res.json({
      success: true,
      admin: {
        id: req.admin._id,
        username: req.admin.username,
        email: req.admin.email,
        fullName: req.admin.fullName || '',
        role: req.admin.role,
        status: req.admin.status || 'active',
        lastLogin: req.admin.lastLogin
      }
    });
  } catch (error) {
    next(error);
  }
};

