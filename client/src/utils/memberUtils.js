/**
 * Resolves the unified, authoritative KTPD Membership ID across the entire application.
 * Prioritizes the true custom / CSV ID (e.g. D343, H501, A001, 00125), strictly avoiding
 * displaying auto-generated KTPD-XXXX placeholders when a genuine ID exists.
 */
export const getDisplayMemberId = (member) => {
  if (!member) return '';

  const custom = member.customFields || {};

  // 1. If primary memberId is present, check if there is an overriding custom field
  if (member.memberId && String(member.memberId).trim()) {
    const trimmed = String(member.memberId).trim();
    const candidateKeys = ['ktpd_id_no', 'ktpd_no', 'ktpdIdNo', 'ktpdId', 'ktpdNo'];
    const hasCustomOverride = candidateKeys.some(
      (k) => custom[k] && String(custom[k]).trim() && String(custom[k]).trim() !== trimmed
    );
    // If not a generic placeholder overridden by an explicit custom field, use it directly!
    if (!hasCustomOverride || !/^KTPD-\d{4}$/i.test(trimmed)) {
      return trimmed;
    }
  }

  // 2. Look for genuine custom KTPD ID value
  const candidateKeys = ['ktpd_id_no', 'ktpd_no', 'ktpdIdNo', 'ktpdId', 'ktpdNo'];
  for (const k of candidateKeys) {
    const val = custom[k];
    if (val && String(val).trim()) {
      return String(val).trim();
    }
  }

  // 3. Dynamic check across all custom fields matching ktpd*no, ktpd*id, or id*no
  for (const [k, v] of Object.entries(custom)) {
    if ((/^ktpd.*(no|id)/i.test(k) || /^id.*no/i.test(k)) && v && String(v).trim()) {
      return String(v).trim();
    }
  }

  // 4. Fallback: primary memberId if exists
  if (member.memberId && String(member.memberId).trim()) {
    return String(member.memberId).trim();
  }

  // 5. If custom.ktpdNo exists, use it
  if (custom.ktpdNo && String(custom.ktpdNo).trim()) {
    return String(custom.ktpdNo).trim();
  }

  return 'No ID Assigned';
};
