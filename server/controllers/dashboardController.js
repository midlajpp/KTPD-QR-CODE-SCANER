import Member from '../models/Member.js';
import AuditLog from '../models/AuditLog.js';

/**
 * @route   GET /api/dashboard/stats
 * @desc    Get aggregate stats directly from MongoDB
 * @access  Private (Admin)
 */
export const getStats = async (req, res, next) => {
  try {
    const [totalMembers, activeMembers, inactiveMembers, bloodGroupAgg, companyAgg] = await Promise.all([
      Member.countDocuments({ isDeleted: false }),
      Member.countDocuments({ isDeleted: false, status: 'Active' }),
      Member.countDocuments({ isDeleted: false, status: 'Inactive' }),
      Member.aggregate([
        { $match: { isDeleted: false } },
        { $group: { _id: '$bloodGroup', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      Member.aggregate([
        { $match: { isDeleted: false, transportCompany: { $ne: '' } } },
        { $group: { _id: '$transportCompany', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 }
      ])
    ]);

    res.json({
      success: true,
      data: {
        totalMembers,
        activeMembers,
        inactiveMembers,
        qrCodesGenerated: totalMembers, // Every created member gets a permanent QR code
        bloodGroupDistribution: bloodGroupAgg.map((item) => ({
          group: item._id || 'Unknown',
          count: item.count
        })),
        topTransportCompanies: companyAgg.map((item) => ({
          company: item._id,
          count: item.count
        }))
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/dashboard/recent
 * @desc    Get recently added members, updated members, and recent audit logs
 * @access  Private (Admin)
 */
export const getRecent = async (req, res, next) => {
  try {
    const [recentlyAdded, recentlyUpdated, recentLogs] = await Promise.all([
      Member.find({ isDeleted: false })
        .sort({ createdAt: -1 })
        .limit(6)
        .select('memberId name transportCompany bloodGroup status createdAt')
        .lean(),
      Member.find({ isDeleted: false })
        .sort({ updatedAt: -1 })
        .limit(6)
        .select('memberId name transportCompany bloodGroup status updatedAt')
        .lean(),
      AuditLog.find()
        .sort({ createdAt: -1 })
        .limit(10)
        .lean()
    ]);

    res.json({
      success: true,
      data: {
        recentlyAdded,
        recentlyUpdated,
        recentLogs
      }
    });
  } catch (error) {
    next(error);
  }
};
