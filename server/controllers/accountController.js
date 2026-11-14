import Admin from '../models/Admin.js';
import AuditLog from '../models/AuditLog.js';

/**
 * @route   GET /api/accounts
 * @desc    Get paginated, searchable, filterable list of accounts
 * @access  Private (Super Admin)
 */
export const getAccounts = async (req, res, next) => {
  try {
    const {
      search = '',
      role = '',
      status = '',
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const query = {};

    // Filter by role
    if (role && ['superadmin', 'admin', 'staff'].includes(role.toLowerCase())) {
      query.role = role.toLowerCase();
    }

    // Filter by status
    if (status && ['active', 'inactive'].includes(status.toLowerCase())) {
      query.status = status.toLowerCase();
    }

    // Search query on username, email, fullName
    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [{ username: regex }, { email: regex }, { fullName: regex }];
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const [accounts, total, stats] = await Promise.all([
      Admin.find(query)
        .select('-passwordHash')
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Admin.countDocuments(query),
      Admin.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            superadmins: { $sum: { $cond: [{ $eq: ['$role', 'superadmin'] }, 1, 0] } },
            admins: { $sum: { $cond: [{ $eq: ['$role', 'admin'] }, 1, 0] } },
            staff: { $sum: { $cond: [{ $eq: ['$role', 'staff'] }, 1, 0] } },
            active: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
            inactive: { $sum: { $cond: [{ $eq: ['$status', 'inactive'] }, 1, 0] } }
          }
        }
      ])
    ]);

    const counts = stats[0] || {
      total: 0,
      superadmins: 0,
      admins: 0,
      staff: 0,
      active: 0,
      inactive: 0
    };

    res.json({
      success: true,
      data: accounts,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      },
      stats: counts
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/accounts/:id
 * @desc    Get account by ID
 * @access  Private (Super Admin)
 */
export const getAccountById = async (req, res, next) => {
  try {
    const account = await Admin.findById(req.params.id).select('-passwordHash').lean();
    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Account not found.'
      });
    }

    res.json({
      success: true,
      data: account
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/accounts
 * @desc    Create a new account
 * @access  Private (Super Admin)
 */
export const createAccount = async (req, res, next) => {
  try {
    const {
      fullName = '',
      username,
      email,
      password,
      confirmPassword,
      role = 'admin',
      status = 'active'
    } = req.body;

    // Validate required fields
    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username, email, and password are required.'
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Password and confirm password do not match.'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.'
      });
    }

    const cleanUsername = username.trim().toLowerCase();
    const cleanEmail = email.trim().toLowerCase();

    if (!['superadmin', 'admin', 'staff'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Supported roles: superadmin, admin, staff.'
      });
    }

    if (!['active', 'inactive'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Supported statuses: active, inactive.'
      });
    }

    // Check unique username and email
    const existing = await Admin.findOne({
      $or: [{ username: cleanUsername }, { email: cleanEmail }]
    });

    if (existing) {
      if (existing.username === cleanUsername) {
        return res.status(400).json({
          success: false,
          message: `Username '${cleanUsername}' is already taken.`
        });
      }
      return res.status(400).json({
        success: false,
        message: `Email '${cleanEmail}' is already registered.`
      });
    }

    // Hash password
    const passwordHash = await Admin.hashPassword(password);

    const newAccount = await Admin.create({
      fullName: fullName.trim(),
      username: cleanUsername,
      email: cleanEmail,
      passwordHash,
      role,
      status,
      createdBy: req.admin?.username || 'system'
    });

    await AuditLog.create({
      action: 'CREATE_ACCOUNT',
      performedBy: req.admin?.username || 'system',
      details: {
        createdUsername: cleanUsername,
        createdEmail: cleanEmail,
        role,
        status
      },
      ipAddress: req.ip || ''
    });

    const responseData = newAccount.toJSON();

    res.status(201).json({
      success: true,
      message: `Account for '${cleanUsername}' created successfully.`,
      data: responseData
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PUT /api/accounts/:id
 * @desc    Update account details (Full Name, Email, Role, Status)
 * @access  Private (Super Admin)
 */
export const updateAccount = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { fullName, email, role, status } = req.body;

    const account = await Admin.findById(id);
    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Account not found.'
      });
    }

    // Safeguard: Cannot demote or deactivate the LAST active Super Admin
    if (account.role === 'superadmin' && (role !== 'superadmin' || status === 'inactive')) {
      const activeSuperAdminCount = await Admin.countDocuments({
        role: 'superadmin',
        status: 'active',
        _id: { $ne: account._id }
      });

      if (activeSuperAdminCount === 0) {
        return res.status(400).json({
          success: false,
          message: 'Cannot deactivate or change the role of the last active Super Admin account.'
        });
      }
    }

    // Check email uniqueness if changing email
    if (email && email.trim().toLowerCase() !== account.email) {
      const cleanEmail = email.trim().toLowerCase();
      const emailExists = await Admin.findOne({ email: cleanEmail, _id: { $ne: id } });
      if (emailExists) {
        return res.status(400).json({
          success: false,
          message: `Email '${cleanEmail}' is already in use by another account.`
        });
      }
      account.email = cleanEmail;
    }

    if (fullName !== undefined) {
      account.fullName = fullName.trim();
    }

    if (role && ['superadmin', 'admin', 'staff'].includes(role)) {
      account.role = role;
    }

    if (status && ['active', 'inactive'].includes(status)) {
      account.status = status;
    }

    await account.save();

    await AuditLog.create({
      action: 'UPDATE_ACCOUNT',
      performedBy: req.admin?.username || 'system',
      details: {
        updatedUsername: account.username,
        role: account.role,
        status: account.status
      },
      ipAddress: req.ip || ''
    });

    const responseData = account.toJSON();

    res.json({
      success: true,
      message: `Account '${account.username}' updated successfully.`,
      data: responseData
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PATCH /api/accounts/:id/status
 * @desc    Activate or deactivate account
 * @access  Private (Super Admin)
 */
export const toggleAccountStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const account = await Admin.findById(id);
    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Account not found.'
      });
    }

    const newStatus = status || (account.status === 'active' ? 'inactive' : 'active');

    if (!['active', 'inactive'].includes(newStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Supported: active, inactive.'
      });
    }

    // Safeguard: Cannot deactivate the last active Super Admin
    if (account.role === 'superadmin' && newStatus === 'inactive') {
      const activeSuperAdminCount = await Admin.countDocuments({
        role: 'superadmin',
        status: 'active',
        _id: { $ne: account._id }
      });

      if (activeSuperAdminCount === 0) {
        return res.status(400).json({
          success: false,
          message: 'Cannot deactivate the last active Super Admin account.'
        });
      }
    }

    account.status = newStatus;
    await account.save();

    await AuditLog.create({
      action: 'TOGGLE_ACCOUNT_STATUS',
      performedBy: req.admin?.username || 'system',
      details: {
        targetUsername: account.username,
        newStatus
      },
      ipAddress: req.ip || ''
    });

    res.json({
      success: true,
      message: `Account '${account.username}' is now ${newStatus}.`,
      data: account.toJSON()
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PATCH /api/accounts/:id/role
 * @desc    Change role of an account
 * @access  Private (Super Admin)
 */
export const changeAccountRole = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!role || !['superadmin', 'admin', 'staff'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Supported roles: superadmin, admin, staff.'
      });
    }

    const account = await Admin.findById(id);
    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Account not found.'
      });
    }

    // Safeguard: Cannot demote the last active Super Admin
    if (account.role === 'superadmin' && role !== 'superadmin') {
      const activeSuperAdminCount = await Admin.countDocuments({
        role: 'superadmin',
        status: 'active',
        _id: { $ne: account._id }
      });

      if (activeSuperAdminCount === 0) {
        return res.status(400).json({
          success: false,
          message: 'Cannot demote the last active Super Admin account.'
        });
      }
    }

    account.role = role;
    await account.save();

    await AuditLog.create({
      action: 'CHANGE_ACCOUNT_ROLE',
      performedBy: req.admin?.username || 'system',
      details: {
        targetUsername: account.username,
        newRole: role
      },
      ipAddress: req.ip || ''
    });

    res.json({
      success: true,
      message: `Role for '${account.username}' updated to '${role}'.`,
      data: account.toJSON()
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PATCH /api/accounts/:id/password
 * @desc    Reset password for an account
 * @access  Private (Super Admin)
 */
export const resetAccountPassword = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { newPassword, confirmPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long.'
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Password and confirm password do not match.'
      });
    }

    const account = await Admin.findById(id);
    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Account not found.'
      });
    }

    account.passwordHash = await Admin.hashPassword(newPassword);
    await account.save();

    await AuditLog.create({
      action: 'RESET_ACCOUNT_PASSWORD',
      performedBy: req.admin?.username || 'system',
      details: {
        targetUsername: account.username
      },
      ipAddress: req.ip || ''
    });

    res.json({
      success: true,
      message: `Password for account '${account.username}' has been successfully reset.`
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   DELETE /api/accounts/:id
 * @desc    Delete an account
 * @access  Private (Super Admin)
 */
export const deleteAccount = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Safeguard: Cannot delete self
    if (req.admin?._id && req.admin._id.toString() === id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own logged-in account.'
      });
    }

    const account = await Admin.findById(id);
    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Account not found.'
      });
    }

    // Safeguard: Cannot delete the last active Super Admin
    if (account.role === 'superadmin') {
      const activeSuperAdminCount = await Admin.countDocuments({
        role: 'superadmin',
        status: 'active',
        _id: { $ne: account._id }
      });

      if (activeSuperAdminCount === 0) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete the last active Super Admin account.'
        });
      }
    }

    await Admin.findByIdAndDelete(id);

    await AuditLog.create({
      action: 'DELETE_ACCOUNT',
      performedBy: req.admin?.username || 'system',
      details: {
        deletedUsername: account.username,
        deletedEmail: account.email,
        role: account.role
      },
      ipAddress: req.ip || ''
    });

    res.json({
      success: true,
      message: `Account '${account.username}' has been permanently deleted.`
    });
  } catch (error) {
    next(error);
  }
};

