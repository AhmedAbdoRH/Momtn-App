// Common Styles - Momtn App Design System
// Shared styles that can be used across all components

import { StyleSheet, Platform } from 'react-native';
import { 
  Colors, 
  Typography, 
  Spacing, 
  BorderRadius, 
  Shadows, 
  ComponentSizes,
  ZIndex 
} from '../../theme';

// Auth Screen Gradient Colors
export const AuthGradientColors = [
  Colors.authGradientStart,
  Colors.authGradientMiddle,
  Colors.authGradientEnd,
] as const;

// Main App Gradient Colors
export const AppGradientColors = [
  Colors.gradientStart,
  Colors.gradientMiddle,
  Colors.gradientEnd,
] as const;

// Common Styles
export const CommonStyles = StyleSheet.create({
  // Containers
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: Spacing.xxl,
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Glass Effect Containers
  glassContainer: {
    backgroundColor: Colors.glassLight,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.borderLighter,
  },
  glassContainerDark: {
    backgroundColor: Colors.glassDark,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  
  // Cards
  card: {
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    ...Shadows.lg,
  },
  cardGlass: {
    backgroundColor: Colors.glassLight,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  
  // Modal
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: ZIndex.modal,
  },
  modalContent: {
    backgroundColor: Colors.modalBackground,
    width: '85%',
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  modalTitle: {
    color: Colors.textPrimary,
    fontSize: Typography.h3.fontSize,
    fontWeight: Typography.h3.fontWeight,
  },
  
  // Buttons
  buttonPrimary: {
    backgroundColor: Colors.primary,
    height: ComponentSizes.buttonHeightLg,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.primary,
  },
  buttonPrimaryText: {
    color: Colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  buttonGlass: {
    backgroundColor: Colors.glassLight,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  buttonGlassText: {
    color: Colors.textSecondary,
    fontSize: 16,
    fontWeight: '500',
  },
  buttonIcon: {
    width: ComponentSizes.buttonIconSize,
    height: ComponentSizes.buttonIconSize,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.glassLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonSuccess: {
    backgroundColor: Colors.success,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
  buttonInfo: {
    backgroundColor: Colors.info,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  
  // Inputs
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderLighter,
  },
  inputIcon: {
    marginRight: Spacing.sm,
  },
  input: {
    flex: 1,
    height: ComponentSizes.inputHeight,
    color: Colors.textPrimary,
    fontSize: 16,
    textAlign: 'right',
  },
  inputGlass: {
    backgroundColor: Colors.glassLight,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    color: Colors.textPrimary,
    fontSize: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  
  // Text Styles
  textPrimary: {
    color: Colors.textPrimary,
  },
  textSecondary: {
    color: Colors.textSecondary,
  },
  textMuted: {
    color: Colors.textMuted,
  },
  textCenter: {
    textAlign: 'center',
  },
  textRight: {
    textAlign: 'right',
  },
  
  // Headers
  headerTitle: {
    fontSize: Typography.h1.fontSize,
    fontWeight: Typography.h1.fontWeight,
    color: Colors.textPrimary,
  },
  sectionTitle: {
    fontSize: Typography.h3.fontSize,
    fontWeight: Typography.h3.fontWeight,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  
  // Dividers
  divider: {
    height: 1,
    backgroundColor: Colors.borderLight,
  },
  dividerVertical: {
    width: 1,
    backgroundColor: Colors.borderLight,
  },
  
  // Spacing helpers
  mb4: { marginBottom: Spacing.xs },
  mb8: { marginBottom: Spacing.sm },
  mb12: { marginBottom: Spacing.md },
  mb16: { marginBottom: Spacing.lg },
  mb20: { marginBottom: Spacing.xl },
  mb24: { marginBottom: Spacing.xxl },
  
  mt4: { marginTop: Spacing.xs },
  mt8: { marginTop: Spacing.sm },
  mt12: { marginTop: Spacing.md },
  mt16: { marginTop: Spacing.lg },
  mt20: { marginTop: Spacing.xl },
  mt24: { marginTop: Spacing.xxl },
  
  p8: { padding: Spacing.sm },
  p12: { padding: Spacing.md },
  p16: { padding: Spacing.lg },
  p20: { padding: Spacing.xl },
  p24: { padding: Spacing.xxl },
  
  // Flex helpers
  row: {
    flexDirection: 'row',
  },
  rowCenter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  flexCenter: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  flex1: {
    flex: 1,
  },
  
  // Bottom Navigation
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: Platform.OS === 'ios' ? ComponentSizes.bottomNavHeightIOS : ComponentSizes.bottomNavHeight,
    zIndex: ZIndex.bottomNav,
  },
  bottomNavContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.sm,
    paddingBottom: Platform.OS === 'ios' ? 25 : 15,
  },
  
  // Top Bar
  topBar: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.xl,
    paddingTop: 50,
    alignItems: 'center',
  },
  topButton: {
    width: ComponentSizes.buttonIconSize,
    height: ComponentSizes.buttonIconSize,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.glassLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // User Dropdown
  userDropdown: {
    position: 'absolute',
    top: 100,
    left: Spacing.xl,
    zIndex: ZIndex.dropdown,
    backgroundColor: Colors.glassBlack,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    width: 200,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  
  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: Colors.textPrimary,
    fontSize: 16,
    marginTop: Spacing.sm,
  },
  
  // Empty State
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.huge,
    paddingVertical: 60,
  },
  emptyStateIcon: {
    fontSize: 64,
    marginBottom: Spacing.xl,
    opacity: 0.3,
  },
  emptyStateTitle: {
    color: Colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  emptyStateText: {
    color: Colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.xl,
  },
});

// Toast/Notification Styles
export const ToastStyles = StyleSheet.create({
  success: {
    backgroundColor: Colors.successBg,
    borderWidth: 1,
    borderColor: Colors.successBorder,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },
  info: {
    backgroundColor: Colors.infoBg,
    borderWidth: 1,
    borderColor: Colors.infoBorder,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },
  warning: {
    backgroundColor: Colors.warningBg,
    borderWidth: 1,
    borderColor: Colors.warningBorder,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },
  error: {
    backgroundColor: Colors.errorBg,
    borderWidth: 1,
    borderColor: Colors.errorBorder,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },
  alert: {
    backgroundColor: Colors.alertBg,
    borderWidth: 1,
    borderColor: Colors.alertBorder,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },
});

export default CommonStyles;
