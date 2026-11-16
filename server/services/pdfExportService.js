import PDFDocument from 'pdfkit';
import { generateQrBuffer, getProfileUrl } from './qrService.js';
import { getMemberDisplayId } from './exportService.js';
import MemberField from '../models/MemberField.js';

/**
 * Draws the recurring top header banner on an A4 page.
 */
const drawPageHeader = (doc, pageNum, totalCount) => {
  const pageWidth = 595.28;
  const margin = 36;
  const contentWidth = pageWidth - margin * 2;

  doc.save();

  // Top Accent Bar
  doc.rect(margin, 20, contentWidth, 3).fill('#1D4ED8');

  // Organization Branding
  doc
    .fontSize(12)
    .font('Helvetica-Bold')
    .fillColor('#0F172A')
    .text('Kerala Transport Drivers Association (KTPD)', margin, 30);

  doc
    .fontSize(8.5)
    .font('Helvetica')
    .fillColor('#475569')
    .text('UAE Chapter • Official Digital Verification Records', margin, 46);

  // Date and Record Count on Right
  const exportDate = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  doc
    .fontSize(8)
    .font('Helvetica')
    .fillColor('#64748B')
    .text(`Exported: ${exportDate} | Records: ${totalCount}`, margin, 32, {
      width: contentWidth,
      align: 'right'
    });

  // Divider line
  doc
    .strokeColor('#E2E8F0')
    .lineWidth(0.75)
    .moveTo(margin, 60)
    .lineTo(margin + contentWidth, 60)
    .stroke();

  doc.restore();
};

/**
 * Draws a single member verification card with complete information and QR code.
 */
const drawMemberCard = (doc, member, displayId, qrBuffer, yPos, customDefsMap) => {
  const margin = 36;
  const cardWidth = 595.28 - margin * 2; // 523.28 pt
  const cardHeight = 225; // Standard height
  const leftColWidth = 370;
  const qrColX = margin + leftColWidth + 12;

  doc.save();

  // Card Background with light border
  doc
    .roundedRect(margin, yPos, cardWidth, cardHeight, 6)
    .fillAndStroke('#FAFAFA', '#E2E8F0');

  // Left Color Strip (Blue)
  doc
    .roundedRect(margin, yPos, 4, cardHeight, 2)
    .fill(member.status === 'Inactive' ? '#EF4444' : '#1D4ED8');

  // 1. Header Row inside card: ID Pill, Status, Blood Group
  let currentY = yPos + 12;
  const innerLeftX = margin + 14;

  // Member ID Badge
  const idBadgeText = `ID: ${displayId}`;
  doc.font('Helvetica-Bold').fontSize(10);
  const idBadgeWidth = doc.widthOfString(idBadgeText) + 16;
  doc
    .roundedRect(innerLeftX, currentY - 2, idBadgeWidth, 18, 4)
    .fill('#1D4ED8');
  doc
    .fillColor('#FFFFFF')
    .text(idBadgeText, innerLeftX + 8, currentY + 2);

  // Status Badge
  const statusX = innerLeftX + idBadgeWidth + 8;
  const statusText = (member.status || 'Active').toUpperCase();
  const isInactive = statusText === 'INACTIVE';
  doc.font('Helvetica-Bold').fontSize(8);
  const statusBadgeWidth = doc.widthOfString(statusText) + 12;
  doc
    .roundedRect(statusX, currentY - 1, statusBadgeWidth, 16, 3)
    .fill(isInactive ? '#FEE2E2' : '#DCFCE7');
  doc
    .fillColor(isInactive ? '#B91C1C' : '#15803D')
    .text(statusText, statusX + 6, currentY + 3);

  // Blood Group Badge (if available)
  if (member.bloodGroup) {
    const bloodX = statusX + statusBadgeWidth + 8;
    const bloodText = `Blood: ${member.bloodGroup}`;
    const bloodWidth = doc.widthOfString(bloodText) + 12;
    doc
      .roundedRect(bloodX, currentY - 1, bloodWidth, 16, 3)
      .fill('#FEE2E2');
    doc
      .fillColor('#B91C1C')
      .text(bloodText, bloodX + 6, currentY + 3);
  }

  // 2. Member Full Name
  currentY += 24;
  doc
    .font('Helvetica-Bold')
    .fontSize(13)
    .fillColor('#0F172A')
    .text(member.name || 'Unnamed Member', innerLeftX, currentY, { width: leftColWidth - 20 });

  // 3. Core Member Details Grid
  currentY += 18;
  const rowHeight = 14;

  const renderField = (label, value, xOffset, yOffset, maxW = 165) => {
    if (!value) return;
    doc.font('Helvetica-Bold').fontSize(8).fillColor('#64748B').text(`${label}: `, xOffset, yOffset, { continued: true });
    doc.font('Helvetica').fontSize(8).fillColor('#1E293B').text(String(value), {
      width: maxW,
      ellipsis: true
    });
  };

  const col1X = innerLeftX;
  const col2X = innerLeftX + 185;

  renderField('Emirates ID', member.emiratesId || 'N/A', col1X, currentY);
  renderField('Mobile (UAE)', member.mobileNo || 'N/A', col2X, currentY);

  currentY += rowHeight;
  renderField('Transport Co', member.transportCompany || 'N/A', col1X, currentY);
  renderField('Emergency Contact', member.emergencyContact || 'N/A', col2X, currentY);

  currentY += rowHeight;
  renderField('Living Area', member.livingArea || 'N/A', col1X, currentY);
  renderField('India Hometown', member.india || 'N/A', col2X, currentY);

  if (member.addressInIndia) {
    currentY += rowHeight;
    renderField('India Address', member.addressInIndia, col1X, currentY, leftColWidth - 20);
  }

  // 4. Custom Attributes (if defined)
  const custom = member.customFields || {};
  const customEntries = Object.entries(custom).filter(([k, v]) => {
    return v !== undefined && v !== null && v !== '' && typeof v !== 'object' && !k.toLowerCase().includes('ktpd');
  });

  if (customEntries.length > 0) {
    currentY += rowHeight + 4;
    doc
      .strokeColor('#E2E8F0')
      .lineWidth(0.5)
      .moveTo(innerLeftX, currentY - 2)
      .lineTo(innerLeftX + leftColWidth - 20, currentY - 2)
      .stroke();

    let customCol = 0;
    let customY = currentY;
    customEntries.slice(0, 4).forEach(([key, val]) => {
      const def = customDefsMap?.[key];
      const label = def?.fieldLabel || key;
      const x = customCol === 0 ? col1X : col2X;
      renderField(label, String(val), x, customY);
      if (customCol === 1) {
        customY += rowHeight;
        customCol = 0;
      } else {
        customCol = 1;
      }
    });
  }

  // 5. Right Column: High-Resolution Permanent QR Code & URL
  if (qrBuffer) {
    const qrSize = 105;
    const qrY = yPos + 18;

    // White backing box for QR
    doc
      .roundedRect(qrColX + 12, qrY, qrSize + 12, qrSize + 12, 4)
      .fillAndStroke('#FFFFFF', '#CBD5E1');

    doc.image(qrBuffer, qrColX + 18, qrY + 6, {
      width: qrSize,
      height: qrSize
    });

    // Caption under QR Code
    const profileUrl = getProfileUrl(member.qrToken);
    doc
      .font('Helvetica-Bold')
      .fontSize(7.5)
      .fillColor('#1D4ED8')
      .text('VERIFIED DIGITAL QR', qrColX, qrY + qrSize + 18, {
        width: 140,
        align: 'center'
      });

    doc
      .font('Helvetica')
      .fontSize(6.5)
      .fillColor('#64748B')
      .text('Scan for official live profile', qrColX, qrY + qrSize + 28, {
        width: 140,
        align: 'center'
      });
  }

  doc.restore();
};

/**
 * Creates an A4 PDF document containing member records and their corresponding QR codes,
 * streaming directly to an HTTP response stream.
 *
 * @param {Array} members List of Member documents to export
 * @param {Response} res Express HTTP response stream
 */
export const createMembersPdfStream = async (members, res) => {
  const doc = new PDFDocument({
    size: 'A4',
    margin: 36,
    bufferPages: true,
    info: {
      Title: 'KTPD Members Directory with QR Verification Codes',
      Author: 'Kerala Transport Drivers Association (KTPD) - UAE Chapter',
      Subject: 'Official Membership & QR Verification Records',
      Creator: 'KTPD Membership Management System'
    }
  });

  doc.pipe(res);

  // Fetch all custom field definitions to map labels accurately
  const activeFields = await MemberField.find({}).lean();
  const customDefsMap = {};
  activeFields.forEach((f) => {
    customDefsMap[f.fieldKey] = f;
  });

  const cardsPerPage = 3;
  const cardHeight = 225;
  const cardSpacing = 16;
  const startY = 75;

  let memberIndex = 0;
  let pageNum = 1;

  while (memberIndex < members.length) {
    if (memberIndex > 0 && memberIndex % cardsPerPage === 0) {
      doc.addPage();
      pageNum++;
    }

    drawPageHeader(doc, pageNum, members.length);

    const pageSlice = members.slice(memberIndex, memberIndex + cardsPerPage);

    // Pre-generate QR code buffers in parallel for this page
    const qrBuffers = await Promise.all(
      pageSlice.map(async (m) => {
        if (!m.qrToken) return null;
        try {
          return await generateQrBuffer(m.qrToken, { width: 300 });
        } catch (e) {
          console.error(`Failed to generate QR for member ${m.memberId}:`, e);
          return null;
        }
      })
    );

    pageSlice.forEach((member, i) => {
      const displayId = getMemberDisplayId(member);
      const y = startY + i * (cardHeight + cardSpacing);
      drawMemberCard(doc, member, displayId, qrBuffers[i], y, customDefsMap);
    });

    memberIndex += pageSlice.length;
  }

  // Draw Footer Page Numbers on all buffered pages
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    doc
      .font('Helvetica')
      .fontSize(8)
      .fillColor('#94A3B8')
      .text(
        `Page ${i + 1} of ${range.count} • Kerala Transport Drivers Association (UAE Chapter) • Confidential`,
        36,
        841.89 - 24,
        {
          width: 595.28 - 72,
          align: 'center'
        }
      );
  }

  doc.end();
};
