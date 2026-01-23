// Theme colors - Momtn App Design System
// Based on Web App Design Guide

export const Colors = {
  // Primary Colors (الألوان الأساسية)
  primary: '#ea384c',
  primaryHover: '#ff535f',
  primaryLight: '#ff7c85',
  primaryDark: '#b73842',

  // Background Gradients (ألوان الخلفية)
  gradientStart: '#2D1F3D',
  gradientMiddle: '#1A1F2C',
  gradientEnd: '#3D1F2C',

  // Auth Screen Gradient
  authGradientStart: '#14090e',
  authGradientMiddle: '#4a1e34',
  authGradientEnd: '#9c3d1a',

  // Glass Effect Backgrounds
  glassLight: 'rgba(255, 255, 255, 0.1)',
  glassMedium: 'rgba(128, 128, 128, 0.5)',
  glassStrong: 'rgba(17, 24, 39, 0.6)',
  glassDark: 'rgba(0, 0, 0, 0.4)',
  glassBlack: 'rgba(0, 0, 0, 0.9)',

  // Specific UI Glass Elements
  glassInput: 'rgba(255, 255, 255, 0.08)',
  glassInputFocused: 'rgba(255, 255, 255, 0.15)',
  glassCard: 'rgba(30, 20, 35, 0.95)',
  glassBorder: 'rgba(255, 255, 255, 0.2)',
  glassHeader: 'rgba(20, 9, 14, 0.8)', // Semi-transparent dark for headers

  // Card Backgrounds
  cardBackground: 'rgba(17, 24, 39, 0.9)',
  modalBackground: 'rgba(35, 20, 30, 0.98)',

  // Text Colors (ألوان النص)
  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.7)',
  textTertiary: 'rgba(255, 255, 255, 0.5)',
  textMuted: 'rgba(255, 255, 255, 0.4)',
  textAmber: '#fef3c7', // amber-100
  textYellow: '#fef9c3', // yellow-100
  textIndigo: '#a5b4fc', // indigo-300
  textPink: '#fbcfe8', // pink-200

  // Light Mode Text
  textDark: '#374151', // gray-700
  textDarkSecondary: '#4B5563', // gray-600

  // Border Colors (ألوان الحدود)
  borderDark: 'rgba(55, 65, 81, 1)', // gray-700
  borderDarker: 'rgba(31, 41, 55, 1)', // gray-800
  borderLight: 'rgba(255, 255, 255, 0.2)',
  borderLighter: 'rgba(255, 255, 255, 0.1)',

  // Status Colors (ألوان الحالة)
  success: '#22c55e',
  successBg: 'rgba(34, 197, 94, 0.8)',
  successBorder: 'rgba(74, 222, 128, 0.5)',

  info: '#3b82f6',
  infoBg: 'rgba(59, 130, 246, 0.8)',
  infoBorder: 'rgba(96, 165, 250, 0.5)',

  warning: '#eab308',
  warningBg: 'rgba(234, 179, 8, 0.8)',
  warningBorder: 'rgba(250, 204, 21, 0.5)',

  error: '#ef4444',
  errorBg: 'rgba(239, 68, 68, 0.8)',
  errorBorder: 'rgba(248, 113, 113, 0.5)',

  alert: '#f97316',
  alertBg: 'rgba(249, 115, 22, 0.8)',
  alertBorder: 'rgba(251, 146, 60, 0.5)',

  // Google Button
  googleBlue: '#4285F4',

  // Basic Colors
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
};

export const Typography = {
  // العناوين الرئيسية
  h1: {
    fontSize: 32,
    fontWeight: '700' as const,
    color: Colors.textPrimary,
  },
  h2: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.textPrimary,
  },
  h3: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: Colors.textPrimary,
  },
  h4: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.textPrimary,
  },

  // النص العادي
  body: {
    fontSize: 16,
    fontWeight: '500' as const,
    color: Colors.textPrimary,
  },
  bodySmall: {
    fontSize: 14,
    fontWeight: '400' as const,
    color: Colors.textSecondary,
  },
  caption: {
    fontSize: 12,
    fontWeight: '400' as const,
    color: Colors.textTertiary,
  },
  tiny: {
    fontSize: 10,
    fontWeight: '400' as const,
    color: Colors.textMuted,
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
  massive: 48,
};

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 9999,
};

export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 1.0,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.23,
    shadowRadius: 2.62,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.30,
    shadowRadius: 4.65,
    elevation: 8,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.37,
    shadowRadius: 7.49,
    elevation: 12,
  },
  primary: {
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  google: {
    shadowColor: Colors.googleBlue,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
};

export const ZIndex = {
  base: 0,
  dropdown: 10,
  overlay: 30,
  modal: 40,
  sidebar: 40,
  bottomNav: 40,
  fixed: 50,
  toast: 60,
};

// Animation Durations
export const AnimationDurations = {
  fast: 150,
  normal: 300,
  slow: 500,
  float: 3000,
  heartBeat: 500,
  pulseSlow: 3000,
};

// Component Sizes
export const ComponentSizes = {
  // Logo
  logoSmall: 120,
  logoMedium: 180,
  logoLarge: 200,

  // Icons
  iconXs: 16,
  iconSm: 20,
  iconMd: 24,
  iconLg: 28,
  iconXl: 32,

  // Buttons
  buttonHeightSm: 36,
  buttonHeightMd: 44,
  buttonHeightLg: 56,
  buttonIconSize: 40,

  // Input
  inputHeight: 50,

  // Bottom Nav
  bottomNavHeight: 80,
  bottomNavHeightIOS: 90,

  // Sidebar
  sidebarWidth: 288,

  // Dropdown
  dropdownWidth: 320,
};

// Glass Effect Styles (for use with StyleSheet)
export const GlassStyles = {
  light: {
    backgroundColor: Colors.glassLight,
  },
  medium: {
    backgroundColor: Colors.glassMedium,
  },
  strong: {
    backgroundColor: Colors.glassStrong,
  },
  dark: {
    backgroundColor: Colors.glassDark,
  },
  black: {
    backgroundColor: Colors.glassBlack,
  },
};

// Common Button Styles
export const ButtonStyles = {
  primary: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    ...Shadows.primary,
  },
  primaryRounded: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
    ...Shadows.primary,
  },
  glass: {
    backgroundColor: Colors.glassLight,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  google: {
    backgroundColor: Colors.googleBlue,
    borderRadius: BorderRadius.full,
    ...Shadows.google,
  },
  success: {
    backgroundColor: Colors.success,
    borderRadius: BorderRadius.lg,
  },
  info: {
    backgroundColor: Colors.info,
    borderRadius: BorderRadius.lg,
  },
};

// Common Input Styles
export const InputStyles = {
  default: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.borderLighter,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    color: Colors.textPrimary,
    fontSize: 16,
  },
  glass: {
    backgroundColor: Colors.glassLight,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    color: Colors.textPrimary,
    fontSize: 16,
  },
};

// Card Styles
export const CardStyles = {
  default: {
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    ...Shadows.lg,
  },
  glass: {
    backgroundColor: Colors.glassLight,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  modal: {
    backgroundColor: Colors.modalBackground,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    ...Shadows.xl,
  },
};

export default {
  Colors,
  Typography,
  Spacing,
  BorderRadius,
  Shadows,
  ZIndex,
  AnimationDurations,
  ComponentSizes,
  GlassStyles,
  ButtonStyles,
  InputStyles,
  CardStyles,
};
