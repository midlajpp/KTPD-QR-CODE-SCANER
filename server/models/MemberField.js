import mongoose from 'mongoose';

export const FIELD_TYPES = [
  'text',
  'alphanumeric',
  'number',
  'phone',
  'email',
  'date',
  'textarea',
  'dropdown',
  'select',
  'checkbox',
  'radio',
  'boolean',
  'url',
  'group'
];

/**
 * Child Sub-Field Schema supporting arbitrary nesting and conditional logic
 */
const childFieldSchema = new mongoose.Schema(
  {
    fieldKey: {
      type: String,
      required: [true, 'Sub-field key is required'],
      trim: true
    },
    fieldLabel: {
      type: String,
      trim: true,
      default: ''
    },
    fieldType: {
      type: String,
      enum: {
        values: FIELD_TYPES,
        message: '{VALUE} is not a supported sub-field type'
      },
      default: 'text'
    },
    options: {
      type: [String],
      default: []
    },
    conditional: {
      enabled: {
        type: Boolean,
        default: false
      },
      dependsOn: {
        type: String,
        default: null
      },
      operator: {
        type: String,
        enum: ['equals', 'not_equals', 'includes'],
        default: 'equals'
      },
      value: {
        type: mongoose.Schema.Types.Mixed,
        default: 'Yes'
      }
    },
    showOnPublicProfile: {
      type: Boolean,
      default: true
    },
    displayOrder: {
      type: Number,
      default: 0
    },
    enabled: {
      type: Boolean,
      default: true
    }
  },
  { _id: true, timestamps: true }
);

// Support recursive child nesting if needed
childFieldSchema.add({
  children: {
    type: [childFieldSchema],
    default: []
  }
});

const memberFieldSchema = new mongoose.Schema(
  {
    fieldKey: {
      type: String,
      required: [true, 'Field key is required'],
      unique: true,
      trim: true,
      match: [/^[a-zA-Z0-9_]+$/, 'Field key must contain only alphanumeric characters and underscores']
    },
    fieldLabel: {
      type: String,
      trim: true,
      default: ''
    },
    fieldType: {
      type: String,
      required: [true, 'Field type is required'],
      enum: {
        values: FIELD_TYPES,
        message: '{VALUE} is not a supported field type'
      },
      default: 'text'
    },
    required: {
      type: Boolean,
      default: false
    },
    enabled: {
      type: Boolean,
      default: true
    },
    isSystemField: {
      type: Boolean,
      default: false
    },
    isSensitive: {
      type: Boolean,
      default: false
    },
    showOnPublicProfile: {
      type: Boolean,
      default: true
    },
    showInCsv: {
      type: Boolean,
      default: true
    },
    showInSearch: {
      type: Boolean,
      default: false
    },
    options: {
      type: [String],
      default: []
    },
    conditional: {
      enabled: {
        type: Boolean,
        default: false
      },
      dependsOn: {
        type: String,
        default: null
      },
      operator: {
        type: String,
        enum: ['equals', 'not_equals', 'includes'],
        default: 'equals'
      },
      value: {
        type: mongoose.Schema.Types.Mixed,
        default: 'Yes'
      }
    },
    children: {
      type: [childFieldSchema],
      default: []
    },
    displayOrder: {
      type: Number,
      default: 0
    },
    isArchived: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

memberFieldSchema.index({ displayOrder: 1, createdAt: 1 });
memberFieldSchema.index({ enabled: 1, isArchived: 1 });

/**
 * Seeds and initializes default core system fields if not already populated.
 */
memberFieldSchema.statics.initializeDefaultFields = async function () {
  const defaultFields = [
    {
      fieldKey: 'name',
      fieldLabel: 'Full Name',
      fieldType: 'text',
      required: true,
      enabled: true,
      isSystemField: true,
      isSensitive: false,
      showOnPublicProfile: true,
      showInCsv: true,
      showInSearch: true,
      displayOrder: 10
    },
    {
      fieldKey: 'emiratesId',
      fieldLabel: 'Emirates ID',
      fieldType: 'text',
      required: false,
      enabled: true,
      isSystemField: true,
      isSensitive: true,
      showOnPublicProfile: true,
      showInCsv: true,
      showInSearch: true,
      displayOrder: 20
    },
    {
      fieldKey: 'mobileNo',
      fieldLabel: 'Mobile No (UAE)',
      fieldType: 'phone',
      required: false,
      enabled: true,
      isSystemField: true,
      isSensitive: false,
      showOnPublicProfile: true,
      showInCsv: true,
      showInSearch: true,
      displayOrder: 30
    },
    {
      fieldKey: 'transportCompany',
      fieldLabel: 'Transport Company',
      fieldType: 'text',
      required: false,
      enabled: true,
      isSystemField: true,
      isSensitive: false,
      showOnPublicProfile: true,
      showInCsv: true,
      showInSearch: true,
      displayOrder: 40
    },
    {
      fieldKey: 'emergencyContact',
      fieldLabel: 'Emergency Contact',
      fieldType: 'phone',
      required: false,
      enabled: true,
      isSystemField: true,
      isSensitive: false,
      showOnPublicProfile: true,
      showInCsv: true,
      showInSearch: false,
      displayOrder: 50
    },
    {
      fieldKey: 'bloodGroup',
      fieldLabel: 'Blood Group',
      fieldType: 'select',
      required: false,
      enabled: true,
      isSystemField: true,
      isSensitive: false,
      showOnPublicProfile: true,
      showInCsv: true,
      showInSearch: true,
      options: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
      displayOrder: 60
    },
    {
      fieldKey: 'livingArea',
      fieldLabel: 'Living Area (UAE)',
      fieldType: 'text',
      required: false,
      enabled: true,
      isSystemField: true,
      isSensitive: false,
      showOnPublicProfile: true,
      showInCsv: true,
      showInSearch: true,
      displayOrder: 70
    },
    {
      fieldKey: 'uae',
      fieldLabel: 'UAE Contact / City',
      fieldType: 'text',
      required: false,
      enabled: true,
      isSystemField: true,
      isSensitive: false,
      showOnPublicProfile: true,
      showInCsv: true,
      showInSearch: false,
      displayOrder: 80
    },
    {
      fieldKey: 'india',
      fieldLabel: 'India Hometown / District',
      fieldType: 'text',
      required: false,
      enabled: true,
      isSystemField: true,
      isSensitive: false,
      showOnPublicProfile: true,
      showInCsv: true,
      showInSearch: false,
      displayOrder: 90
    },
    {
      fieldKey: 'addressInIndia',
      fieldLabel: 'Address in India',
      fieldType: 'textarea',
      required: false,
      enabled: true,
      isSystemField: true,
      isSensitive: true,
      showOnPublicProfile: true,
      showInCsv: true,
      showInSearch: false,
      displayOrder: 100
    }
  ];

  for (const field of defaultFields) {
    await this.findOneAndUpdate(
      { fieldKey: field.fieldKey },
      { $setOnInsert: field },
      { upsert: true, new: true }
    );
  }

  // Ensure optional member information fields do not block member creation
  await this.updateMany(
    { fieldKey: { $in: ['emiratesId', 'mobileNo', 'transportCompany', 'emergencyContact', 'bloodGroup', 'livingArea', 'uae', 'india', 'addressInIndia'] } },
    { $set: { required: false } }
  );
};

const MemberField = mongoose.model('MemberField', memberFieldSchema);

export default MemberField;

