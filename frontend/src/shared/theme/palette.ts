// Single source of truth for all colors in the app.
// To swap palettes, change only these values.

export const palette = {
  lightest:  '#cad2c5', // ash-grey
  light:     '#84a98c', // muted-teal
  mid:       '#52796f', // deep-teal
  dark:      '#354f52', // dark-slate-grey
  darkest:   '#2f3e46', // charcoal-blue
};

// Derived colors
export const ACCENT = palette.light;
export const ACCENT_HOVER = palette.mid;
export const KEY_ACCENT = palette.lightest;
export const KEY_ACCENT_HOVER = '#b8c2b3';

// Theme backgrounds & text
export const backgrounds = {
  dark:      { default: palette.darkest, paper: palette.dark },
  light:     { default: '#f5f7f3',      paper: '#ffffff' },
};

export const text = {
  dark:      { primary: palette.lightest, secondary: '#8a9a8e' },
  light:     { primary: palette.darkest,  secondary: palette.dark },
};

export const divider = {
  dark:  `rgba(202,210,197,0.12)`,
  light: `rgba(47,62,70,0.12)`,
};
