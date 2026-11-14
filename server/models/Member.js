import mongoose from 'mongoose';

const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const memberSchema = new mongoose.Schema(
  {
    memberId: {
      type: String,
      required: [true, 'Member ID is required'],
      unique: true,
      trim: true,
      index: true
    },
    qrToken: {
      type: String,
      required: [true, 'QR token is required'],
      unique: true,
      trim: true,
      index: true,
      immutable: true
    },
    name: {
      type: String,
      trim: true,
      default: ''
    },
    emiratesId: {
      type: String,
      trim: true,
      default: ''
    },
    mobileNo: {
      type: String,
      trim: true,
      default: ''
    },
    transportCompany: {
      type: String,
      trim: true,
      default: ''
    },
    emergencyContact: {
      type: String,
      trim: true,
      default: ''
    },
    uae: {
      type: String,
      trim: true,
      default: ''
    },
    india: {
      type: String,
      trim: true,
      default: ''
    },
    addressInIndia: {
      type: String,
      trim: true,
      default: ''
    },
    livingArea: {
      type: String,
      trim: true,
      default: ''
    },
    bloodGroup: {
      type: String,
      trim: true,
      default: ''
    },
    status: {
      type: String,
      enum: ['Active', 'Inactive'],
      default: 'Active',
      index: true
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true
    },
    deletedAt: {
      type: Date,
      default: null
    },
    customFields: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    privacySettings: {
      hideEmiratesId: {
        type: Boolean,
        default: true
      },
      hideAddressInIndia: {
        type: Boolean,
        default: true
      },
      hideEmergencyContact: {
        type: Boolean,
        default: false
      }
    }
  },
  {
    timestamps: true
  }
);

// Compound text index for fast search
memberSchema.index({
  name: 'text',
  memberId: 'text',
  mobileNo: 'text',
  transportCompany: 'text'
});

// Non-deleted lookup index
memberSchema.index({ isDeleted: 1, status: 1 });

/**
 * CRITICAL QR CODE IMMUTABILITY ENFORCEMENT:
 * Each member has a permanent QR token and permanent QR URL.
 * When profile fields are edited or imported, never regenerate or alter the QR token.
 */
memberSchema.pre(['validate', 'save'], function (next) {
  if (!this.isNew && (this.isModified('qrToken') || this.isDirectModified('qrToken'))) {
    const err = new Error(
      'CRITICAL VIOLATION: QR token is permanent and immutable. It cannot be modified or regenerated for existing members.'
    );
    return next(err);
  }
  next();
});

memberSchema.pre(['findOneAndUpdate', 'updateOne', 'updateMany'], function (next) {
  const update = this.getUpdate();
  if (update) {
    if (update.qrToken !== undefined) {
      delete update.qrToken;
    }
    if (update.$set && update.$set.qrToken !== undefined) {
      delete update.$set.qrToken;
    }
  }
  next();
});

const Member = mongoose.model('Member', memberSchema);

export default Member;

