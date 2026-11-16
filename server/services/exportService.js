import archiver from 'archiver';
import { generateQrBuffer, getProfileUrl } from './qrService.js';
import { exportMembersToCsv } from './csvService.js';

/**
 * Resolves authoritative member display ID (matches CSV qrImage column)
 */
export const getMemberDisplayId = (member) => {
  if (!member) return 'Unknown_ID';
  const custom = member.customFields || {};

  // 1. Authoritative primary memberId directly (preserving exact string, leading zeros, alphanumeric)
  if (member.memberId && String(member.memberId).trim()) {
    const trimmed = String(member.memberId).trim();
    const candidateKeys = ['ktpd_id_no', 'ktpd_no', 'ktpdIdNo', 'ktpdId', 'ktpdNo'];
    const hasCustomOverride = candidateKeys.some(
      (k) => custom[k] && String(custom[k]).trim() && String(custom[k]).trim() !== trimmed
    );
    // If not a generic placeholder overridden by an explicit custom field, use it directly
    if (!hasCustomOverride || !/^KTPD-\d{4}$/i.test(trimmed)) {
      return trimmed.replace(/[\\/:*?"<>|]/g, '_');
    }
  }

  // 2. Candidate custom fields that hold the genuine ID
  const candidateKeys = ['ktpd_id_no', 'ktpd_no', 'ktpdIdNo', 'ktpdId', 'ktpdNo'];
  for (const k of candidateKeys) {
    const val = custom[k];
    if (val && String(val).trim()) {
      return String(val).trim().replace(/[\\/:*?"<>|]/g, '_');
    }
  }

  // 3. Dynamic search across all custom attributes matching ktpd* or id*
  for (const [k, v] of Object.entries(custom)) {
    if ((/^ktpd.*(no|id)/i.test(k) || /^id.*no/i.test(k)) && v && String(v).trim()) {
      return String(v).trim().replace(/[\\/:*?"<>|]/g, '_');
    }
  }

  // 4. Fallback
  const fallback = member.memberId || custom.ktpdNo || 'Unknown_ID';
  return String(fallback).trim().replace(/[\\/:*?"<>|]/g, '_');
};

/**
 * Generates an individual member profile summary text file.
 */
export const generateMemberDetailText = (member, displayId) => {
  const custom = member.customFields || {};
  let content = `================================================================================\n`;
  content += `KTPD MEMBER PROFILE RECORD\n`;
  content += `Kerala Transport Drivers Association - UAE Chapter\n`;
  content += `================================================================================\n\n`;
  content += `[OFFICIAL IDENTIFIERS]\n`;
  content += `Membership ID:     ${displayId}\n`;
  content += `Status:            ${member.status || 'Active'}\n`;
  content += `Blood Group:       ${member.bloodGroup || 'N/A'}\n\n`;
  content += `[MEMBER PERSONAL & CONTACT DETAILS]\n`;
  content += `Full Name:         ${member.name || 'N/A'}\n`;
  content += `Emirates ID:       ${member.emiratesId || 'N/A'}\n`;
  content += `Mobile No (UAE):   ${member.mobileNo || 'N/A'}\n`;
  content += `Transport Company: ${member.transportCompany || 'N/A'}\n`;
  content += `Emergency Contact: ${member.emergencyContact || 'N/A'}\n`;
  content += `Living Area (UAE): ${member.livingArea || 'N/A'}\n`;
  content += `India Hometown:    ${member.india || 'N/A'}\n`;
  content += `Address in India:  ${member.addressInIndia || 'N/A'}\n\n`;

  const customEntries = Object.entries(custom).filter(
    ([k, v]) => v !== undefined && v !== null && v !== '' && typeof v !== 'object' && !k.toLowerCase().includes('ktpd')
  );
  if (customEntries.length > 0) {
    content += `[ADDITIONAL ATTRIBUTES]\n`;
    customEntries.forEach(([k, v]) => {
      content += `${k.padEnd(19)}: ${v}\n`;
    });
    content += `\n`;
  }

  content += `[QR VERIFICATION & DIGITAL ID]\n`;
  content += `Permanent Profile: ${getProfileUrl(member.qrToken)}\n`;
  content += `QR Image File:     QR-Codes/${displayId}.png\n\n`;
  content += `Created At:        ${new Date(member.createdAt || Date.now()).toISOString()}\n`;
  content += `================================================================================\n`;
  return content;
};

/**
 * Creates a ZIP archive containing ONLY individual high-resolution QR PNG files
 * named after each member's unique Member ID (e.g. A001.png, D343.png).
 * Does NOT include personal member data in this archive.
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
      // Add inside KTPD-QR-Codes folder and flat for maximum compatibility
      archive.append(qrBuffer, { name: `KTPD-QR-Codes/${displayId}.png` });
      archive.append(qrBuffer, { name: `${displayId}.png` });
    }
  });

  await Promise.all(qrPromises);

  const readmeContent = `================================================================================
KTPD QR CODES EXPORT (QR CODES ONLY)
Kerala Transport Drivers Association - UAE Chapter
================================================================================

Contents:
---------
- Individual high-resolution PNG images (300 DPI) for each selected member.
- Filenames match the official KTPD Membership ID (e.g. A001.png, D343.png).
- Each QR code encodes the member's permanent, unalterable verification profile URL.
- No member personal details or contact data are contained in this archive.

Usage:
------
- Print directly on physical membership ID cards or badges.
- Import directly into Adobe Illustrator, Photoshop, InDesign or card printers.
- When scanned with any smartphone camera, the QR code resolves to the official
  verified member credentials on the KTPD platform.

Export Date:      ${new Date().toISOString()}
Total QR Codes:   ${members.filter((m) => m.qrToken).length}
================================================================================
`;
  archive.append(readmeContent, { name: 'KTPD-QR-Codes/README.txt' });
  archive.append(readmeContent, { name: 'README.txt' });

  await archive.finalize();
};

/**
 * Creates a complete unified ZIP archive containing:
 * - Members.csv (with all fields and qrImage column)
 * - Member-Details/ folder with individual member detail files
 * - QR-Codes/ folder containing individual QR PNG images
 * - README.txt
 *
 * Filename: KTPD-Members-and-QR.zip / KTPD-Export.zip
 */
export const createCompleteExportZipStream = async (members, res) => {
  const archive = archiver('zip', {
    zlib: { level: 9 }
  });

  archive.on('error', (err) => {
    throw err;
  });

  archive.pipe(res);

  // 1. Generate dynamic CSV with all field labels, qrImage column, and UTF-8 BOM
  const csvContent = await exportMembersToCsv(members, { includeQrImage: true });
  archive.append(csvContent, { name: 'Members.csv' });
  archive.append(csvContent, { name: 'KTPD-Members.csv' });

  // 2. Generate individual Member-Details/ text files and QR-Codes/ PNG images
  const itemPromises = members.map(async (member) => {
    const displayId = getMemberDisplayId(member);

    // Individual member detail text file
    const detailText = generateMemberDetailText(member, displayId);
    archive.append(detailText, { name: `Member-Details/${displayId}.txt` });
    archive.append(detailText, { name: `KTPD-Export/Member-Details/${displayId}.txt` });

    // Individual high-res QR PNG
    if (member.qrToken) {
      const qrBuffer = await generateQrBuffer(member.qrToken, { width: 600 });
      archive.append(qrBuffer, { name: `QR-Codes/${displayId}.png` });
      archive.append(qrBuffer, { name: `KTPD-Export/QR-Codes/${displayId}.png` });
    }
  });

  await Promise.all(itemPromises);

  // 3. Append README.txt explaining export structure and qrImage matching
  const readmeContent = `================================================================================
KTPD MEMBERSHIP MANAGEMENT SYSTEM - ADVANCED BULK EXPORT ARCHIVE
Kerala Transport Drivers Association - UAE Chapter
================================================================================

Archive Structure:
------------------
1. Members.csv / KTPD-Members.csv
   - Comprehensive CSV export of selected member records, including core contact
     information, transport companies, blood groups, and dynamic custom fields.
   - Includes the 'qrImage' column specifying the exact PNG filename in 'QR-Codes/'.

2. Member-Details/
   - Directory containing individual member profile summary files (${members.length} records).
   - Filenames: <MembershipID>.txt (e.g. A001.txt, D343.txt).

3. QR-Codes/
   - Directory containing individual high-resolution PNG QR codes (600x600 px, 300 DPI).
   - Named after each member's unique Member ID (e.g. A001.png, D343.png).
   - Encodes the member's permanent verification profile URL.

4. README.txt
   - This documentation and archive mapping guide.

Security & Integrity Notice:
----------------------------
- Every QR code encodes the permanent profile URL. Scanning opens the official
  digital verification page on the KTPD platform.
- Existing QR tokens and MongoDB records were not modified during export.

Export Date:      ${new Date().toISOString()}
Selected Members: ${members.length}
================================================================================
`;
  archive.append(readmeContent, { name: 'README.txt' });
  archive.append(readmeContent, { name: 'KTPD-Export/README.txt' });

  await archive.finalize();
};
