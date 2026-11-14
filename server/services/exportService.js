import archiver from 'archiver';
import { generateQrBuffer } from './qrService.js';
import { exportMembersToCsv } from './csvService.js';

/**
 * Resolves authoritative member display ID (matches CSV qrImage column)
 */
export const getMemberDisplayId = (member) => {
  if (!member) return 'Unknown_ID';
  const custom = member.customFields || {};

  // 1. Authoritative memberId if not an auto-generated placeholder
  if (member.memberId && !/^KTPD-\d{4}$/i.test(String(member.memberId).trim())) {
    return String(member.memberId).trim().replace(/[\\/:*?"<>|]/g, '_');
  }

  // 2. Candidate custom fields that hold the genuine ID
  const candidateKeys = ['ktpd_id_no', 'ktpd_no', 'ktpdIdNo', 'ktpdId', 'ktpdNo'];
  for (const k of candidateKeys) {
    const val = custom[k];
    if (val && String(val).trim() && !/^KTPD-\d{4}$/i.test(String(val).trim())) {
      return String(val).trim().replace(/[\\/:*?"<>|]/g, '_');
    }
  }

  // 3. Dynamic search across all custom attributes
  for (const [k, v] of Object.entries(custom)) {
    if ((/^ktpd.*(no|id)/i.test(k) || /^id.*no/i.test(k)) && v && !/^KTPD-\d{4}$/i.test(String(v).trim())) {
      return String(v).trim().replace(/[\\/:*?"<>|]/g, '_');
    }
  }

  // 4. Fallback
  const fallback = member.memberId || custom.ktpdNo || 'Unknown_ID';
  return String(fallback).trim().replace(/[\\/:*?"<>|]/g, '_');
};

/**
 * Creates a ZIP archive containing individual high-resolution QR PNG files
 * named after each member's unique Member ID (e.g. D343.png).
 *
 * Filename: KTPD-QR-Codes.zip
 */
export const createQrZipStream = async (members, res) => {
  const archive = archiver('zip', {
    zlib: { level: 9 }
  });

  archive.on('error', (err) => {
    throw err;
  });

  archive.pipe(res);

  // Generate and append each high-res QR PNG
  const qrPromises = members.map(async (member) => {
    if (member.qrToken) {
      const displayId = getMemberDisplayId(member);
      const qrBuffer = await generateQrBuffer(member.qrToken, { width: 600 });
      archive.append(qrBuffer, { name: `${displayId}.png` });
    }
  });

  await Promise.all(qrPromises);
  await archive.finalize();
};

/**
 * Creates a unified ZIP archive containing both the dynamic CSV and
 * high-resolution QR PNG files inside a clean folder structure:
 *
 * KTPD-Export/
 *   KTPD-Members.csv
 *   QR-Codes/
 *     D343.png
 *     D344.png
 *   README.txt
 *
 * Filename: KTPD-Export.zip
 */
export const createCompleteExportZipStream = async (members, res) => {
  const archive = archiver('zip', {
    zlib: { level: 9 }
  });

  archive.on('error', (err) => {
    throw err;
  });

  archive.pipe(res);

  // 1. Generate dynamic CSV with field labels, qrImage column, and UTF-8 BOM
  const csvContent = await exportMembersToCsv(members);
  archive.append(csvContent, { name: 'KTPD-Export/KTPD-Members.csv' });

  // 2. Generate and append each high-res QR PNG into QR-Codes/ folder
  const qrPromises = members.map(async (member) => {
    if (member.qrToken) {
      const displayId = getMemberDisplayId(member);
      const qrBuffer = await generateQrBuffer(member.qrToken, { width: 600 });
      archive.append(qrBuffer, { name: `KTPD-Export/QR-Codes/${displayId}.png` });
    }
  });

  await Promise.all(qrPromises);

  // 3. Append README.txt explaining export structure and qrImage matching
  const readmeContent = `================================================================================
KTPD MEMBERSHIP MANAGEMENT SYSTEM - BULK EXPORT ARCHIVE
Kerala Transport Drivers Association - UAE Chapter
================================================================================

Archive Structure:
------------------
1. KTPD-Members.csv
   - Comprehensive CSV export of selected member records, including core contact
     information, transport companies, blood groups, and dynamic custom fields.
   - Includes the 'qrImage' column which specifies the exact PNG filename for each
     member's permanent QR code image in the 'QR-Codes/' folder (e.g. D343.png).

2. QR-Codes/
   - Directory containing high-resolution PNG QR codes (600x600 px, 300 DPI).
   - Each PNG is named after the member's unique ID (e.g. D343.png, D344.png).
   - Each QR code encodes the member's permanent, unalterable verification profile URL:
     https://<ktpd-domain>/m/<qrToken>

3. README.txt
   - This documentation and archive mapping guide.

How to Match Members with QR Codes:
-----------------------------------
1. Open 'KTPD-Members.csv' in Microsoft Excel or your preferred spreadsheet tool.
2. Locate the 'qrImage' column (e.g. D343.png).
3. Access the 'QR-Codes/' directory in this ZIP to locate the matching image file.

Security & Integrity Notice:
----------------------------
- Every QR code encodes the permanent profile URL. Scanning the QR code opens the
  official live verification page directly from the KTPD membership database.
- Private system tokens and administrative credentials are never exported.

Export Date: ${new Date().toISOString()}
Selected Members: ${members.length}
================================================================================
`;
  archive.append(readmeContent, { name: 'KTPD-Export/README.txt' });

  await archive.finalize();
};
