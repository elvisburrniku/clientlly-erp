// Unified PDF styling for all documents
export const PDF_COLORS = {
  header: [55, 65, 81],        // Gray-700
  darkText: [30, 41, 59],      // Slate-800
  grayText: [71, 85, 105],     // Slate-600
  lightGray: [226, 232, 240],  // Slate-200
  white: [255, 255, 255],
  lightBg: [245, 248, 255],    // Blue-50 (for table alternating rows)
};

export const PDF_FONTS = {
  title: { size: 24, weight: 'bold' },
  heading: { size: 12, weight: 'bold' },
  subheading: { size: 11, weight: 'bold' },
  normal: { size: 10, weight: 'normal' },
  small: { size: 9, weight: 'normal' },
  tiny: { size: 8, weight: 'normal' },
};

export const safe = (str) =>
  String(str || '')
    .replace(/ë/g, 'e').replace(/Ë/g, 'E')
    .replace(/ç/g, 'c').replace(/Ç/g, 'C')
    .replace(/—/g, '-');

export const hexToRgb = (hex) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)] : PDF_COLORS.header;
};

export const setTextStyle = (doc, style, color = 'darkText') => {
  const colors = PDF_COLORS;
  doc.setFontSize(style.size);
  doc.setFont('helvetica', style.weight);
  doc.setTextColor(...colors[color] || colors.darkText);
};