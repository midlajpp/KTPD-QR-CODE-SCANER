import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true,
      enum: [
        'CREATE_MEMBER',
        'UPDATE_MEMBER',
        'DELETE_MEMBER',
        'BULK_DELETE_MEMBERS',
        'TOGGLE_STATUS',
        'IMPORT_CSV',
        'EXPORT_CSV',
        'EXPORT_CSV_DATA_ONLY',
        'EXPORT_PDF',
        'EXPORT_QR',
        'EXPORT_ALL',
        'BULK_EXPORT',
        'EXPORT_ILLUSTRATOR',
        'UPDATE_PROFILE_DESIGN_DRAFT',
        'PUBLISH_PROFILE_DESIGN',
        'RESET_PROFILE_DESIGN',
        'ADMIN_LOGIN',
        'ADMIN_LOGOUT',
        'CREATE_ACCOUNT',
        'UPDATE_ACCOUNT',
        'DELETE_ACCOUNT',
        'TOGGLE_ACCOUNT_STATUS',
        'CHANGE_ACCOUNT_ROLE',
        'RESET_ACCOUNT_PASSWORD'
      ]
    },
    performedBy: {
      type: String,
      default: 'system'
    },
    targetMemberId: {
      type: String,
      default: null
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    ipAddress: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: { createdAt: true, updatedAt: false }
  }
);

auditLogSchema.index({ createdAt: -1 });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

export default AuditLog;

