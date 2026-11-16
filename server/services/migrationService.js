import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Member from '../models/Member.js';
import MemberField from '../models/MemberField.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Initializes and preserves configured dynamic field definitions in the database.
 * Strictly does NOT seed or restore any sample or demo members.
 */
export const initializeFieldDefinitions = async () => {
  try {
    const fieldsFile = path.resolve(__dirname, '../backups/latest_fields.json');

    if (fs.existsSync(fieldsFile)) {
      const fieldsData = JSON.parse(fs.readFileSync(fieldsFile, 'utf-8'));
      for (const field of fieldsData) {
        const { _id, createdAt, updatedAt, __v, ...fieldDoc } = field;
        await MemberField.findOneAndUpdate(
          { fieldKey: field.fieldKey },
          { $setOnInsert: fieldDoc },
          { upsert: true, new: true, timestamps: false }
        );
      }
      console.log(`[Configuration] Verified ${fieldsData.length} custom and core field definition(s).`);
    }
  } catch (err) {
    console.warn('[Configuration Warning] Could not initialize field definitions:', err.message);
  }
};

// Backward-compatibility alias
export const restoreSandboxDataIfEmpty = initializeFieldDefinitions;

/**
 * Startup migration to synchronize existing members' Member IDs with their authoritative CSV / KTPD NO value.
 * Corrects records where auto-generated KTPD-XXXX placeholders replaced the real ID.
 * Strictly preserves all permanent tokens and QR URLs.
 */
export const syncMemberIds = async () => {
  try {
    const members = await Member.find({ isDeleted: { $ne: true } });
    let updatedCount = 0;

    for (const member of members) {
      const custom = member.customFields || {};
      let customKtpdNo = null;

      // 1. Check specific custom keys that hold the genuine imported ID
      const candidateKeys = ['ktpd_id_no', 'ktpd_no', 'ktpdIdNo', 'ktpdId', 'ktpdNo'];
      for (const k of candidateKeys) {
        const val = custom[k];
        if (val && String(val).trim() && !/^KTPD-\d{4}$/i.test(String(val).trim())) {
          customKtpdNo = String(val).trim();
          break;
        }
      }

      // 2. Check dynamic custom fields matching ktpd*no, ktpd*id, or id*no
      if (!customKtpdNo) {
        for (const [k, v] of Object.entries(custom)) {
          if ((/^ktpd.*(no|id)/i.test(k) || /^id.*no/i.test(k)) && v && !/^KTPD-\d{4}$/i.test(String(v).trim())) {
            customKtpdNo = String(v).trim();
            break;
          }
        }
      }

      // 3. Fallback: if custom.ktpdNo is set to something non-empty
      if (!customKtpdNo && custom.ktpdNo && String(custom.ktpdNo).trim()) {
        customKtpdNo = String(custom.ktpdNo).trim();
      }

      let needsSave = false;

      // Sync transportCompany if present in customFields (e.g. transport_company_name) but blank on member
      if (!member.transportCompany && custom.transport_company_name && String(custom.transport_company_name).trim()) {
        member.transportCompany = String(custom.transport_company_name).trim();
        needsSave = true;
      }

      if (customKtpdNo && member.memberId !== customKtpdNo) {
        // Check if customKtpdNo is already taken by another active member
        const conflict = await Member.findOne({
          _id: { $ne: member._id },
          memberId: customKtpdNo,
          isDeleted: false
        });

        if (!conflict) {
          console.log(`[Migration] Syncing Member ID for ${member.name}: ${member.memberId} -> ${customKtpdNo}`);
          member.memberId = customKtpdNo;
          if (!member.customFields) member.customFields = {};
          member.customFields.ktpdNo = customKtpdNo;
          if (member.customFields.ktpd_id_no) {
            member.customFields.ktpd_id_no = customKtpdNo;
          }
          member.markModified('customFields');
          needsSave = true;
          updatedCount++;
        } else {
          console.warn(`[Migration Warning] Cannot migrate ${member.memberId} to ${customKtpdNo}: already used by member ${conflict._id}`);
        }
      }

      if (needsSave) {
        await member.save();
      }
    }

    if (updatedCount > 0) {
      console.log(`[Migration] Successfully synchronized ${updatedCount} member ID(s) with their authoritative KTPD number.`);
    }
  } catch (err) {
    console.error('[Migration Error] Failed to sync member IDs:', err.message);
  }
};


