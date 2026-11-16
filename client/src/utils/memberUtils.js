/**
 * Resolves the unified, authoritative KTPD Membership ID across the entire application.
 * Prioritizes the true custom / CSV ID (e.g. D343, H501, A001, 00125), strictly avoiding
 * displaying auto-generated KTPD-XXXX placeholders when a genuine ID exists.
 */
export const getDisplayMemberId = (member) => {
  if (!member) return '';

  const custom = member.customFields || {};
  const candidateKeys = ['ktpd_id_no', 'ktpd_no', 'ktpdIdNo', 'ktpdId', 'ktpdNo'];

  // Check if there is an explicit custom KTPD ID that should override a placeholder or numeric row id
  let customIdVal = null;
  for (const k of candidateKeys) {
    const val = custom[k];
    if (val && String(val).trim()) {
      customIdVal = String(val).trim();
      break;
    }
  }

  if (member.memberId && String(member.memberId).trim()) {
    const trimmed = String(member.memberId).trim();
    // If memberId is a generic placeholder (KTPD-XXXX) and a custom ID exists, use custom
    if (/^KTPD-\d{4}$/i.test(trimmed) && customIdVal) {
      return customIdVal;
    }
    // If memberId is just a row index / integer (e.g. "1") and customIdVal has a real code (e.g. "A001"), use custom
    if (/^\d{1,4}$/.test(trimmed) && customIdVal && !/^\d{1,4}$/.test(customIdVal)) {
      return customIdVal;
    }
    return trimmed;
  }

  if (customIdVal) return customIdVal;

  // 3. Dynamic check across all custom fields matching ktpd*no, ktpd*id, or id*no
  for (const [k, v] of Object.entries(custom)) {
    if ((/^ktpd.*(no|id)/i.test(k) || /^id.*no/i.test(k)) && v && String(v).trim()) {
      return String(v).trim();
    }
  }

  // 4. Fallback: custom.ktpdNo if exists
  if (custom.ktpdNo && String(custom.ktpdNo).trim()) {
    return String(custom.ktpdNo).trim();
  }

  return 'No ID Assigned';
};
