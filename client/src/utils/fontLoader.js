const loadedFonts = new Set();

const FONT_URLS = {
  Poppins: 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap',
  Inter: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap',
  Nunito: 'https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800&display=swap',
  Montserrat: 'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap',
  Roboto: 'https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;600;700;800&display=swap'
};

export const loadGoogleFont = (fontFamily) => {
  if (!fontFamily || !FONT_URLS[fontFamily] || loadedFonts.has(fontFamily)) {
    return;
  }

  try {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = FONT_URLS[fontFamily];
    document.head.appendChild(link);
    loadedFonts.add(fontFamily);
  } catch (err) {
    console.warn('Failed to dynamically load Google Font:', fontFamily, err);
  }
};

