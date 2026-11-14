import QRCode from 'qrcode';

/**
 * Returns the permanent public profile URL for a given member QR token.
 */
export const getProfileUrl = (qrToken) => {
  const baseUrl = process.env.PUBLIC_BASE_URL || process.env.CLIENT_URL || 'http://localhost:5173';
  const cleanBaseUrl = baseUrl.replace(/\/+$/, '');
  return `${cleanBaseUrl}/m/${qrToken}`;
};

/**
 * Generates a high-resolution PNG Buffer of the permanent QR code.
 * Uses high error correction ('H' ~30%) and 1024px size for crystal-clear ID card printing.
 */
export const generateQrBuffer = async (qrToken, options = {}) => {
  const url = getProfileUrl(qrToken);
  const defaultOptions = {
    errorCorrectionLevel: 'H',
    type: 'png',
    quality: 1.0,
    margin: 2,
    width: 600, // 600x600px is 600 DPI for 1-inch ID card QR codes
    color: {
      dark: '#000000',
      light: '#FFFFFF'
    },
    ...options
  };

  return QRCode.toBuffer(url, defaultOptions);
};

/**
 * Generates a Base64 data URL string for immediate UI preview in browsers.
 */
export const generateQrDataUrl = async (qrToken, options = {}) => {
  const url = getProfileUrl(qrToken);
  const defaultOptions = {
    errorCorrectionLevel: 'H',
    margin: 2,
    width: 512,
    color: {
      dark: '#000000',
      light: '#FFFFFF'
    },
    ...options
  };

  return QRCode.toDataURL(url, defaultOptions);
};
