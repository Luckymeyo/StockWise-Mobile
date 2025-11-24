/**
 * Common Modern UI Components
 * Reusable components for consistent design
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Colors, { shadows, radius, spacing, typography } from '../styles/colors';

/**
 * Modern Card Component
 */
export const Card = ({ children, style, onPress, elevated = true }) => {
  const Component = onPress ? TouchableOpacity : View;
  
  return (
    <Component
      style={[
        styles.card,
        elevated && shadows.medium,
        style,
      ]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      {children}
    </Component>
  );
};

/**
 * Modern Button Component
 */
export const Button = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  icon,
  disabled = false,
  fullWidth = false,
  style,
}) => {
  const buttonStyles = [
    styles.button,
    styles[`button${size.charAt(0).toUpperCase() + size.slice(1)}`],
    styles[`button${variant.charAt(0).toUpperCase() + variant.slice(1)}`],
    fullWidth && styles.buttonFullWidth,
    disabled && styles.buttonDisabled,
    style,
  ];

  const textStyles = [
    styles.buttonText,
    styles[`buttonText${size.charAt(0).toUpperCase() + size.slice(1)}`],
    styles[`buttonText${variant.charAt(0).toUpperCase() + variant.slice(1)}`],
    disabled && styles.buttonTextDisabled,
  ];

  return (
    <TouchableOpacity
      style={buttonStyles}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
    >
      {icon && <Text style={styles.buttonIcon}>{icon}</Text>}
      <Text style={textStyles}>{title}</Text>
    </TouchableOpacity>
  );
};

/**
 * Modern Stat Card Component
 */
export const StatCard = ({
  icon,
  title,
  value,
  subtitle,
  color = Colors.primary,
  onPress,
}) => {
  return (
    <Card onPress={onPress} style={styles.statCard}>
      <View style={[styles.statIconContainer, { backgroundColor: color + '15' }]}>
        <Text style={styles.statIcon}>{icon}</Text>
      </View>
      <View style={styles.statContent}>
        <Text style={styles.statTitle}>{title}</Text>
        <Text style={[styles.statValue, { color }]}>{value}</Text>
        {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
      </View>
    </Card>
  );
};

/**
 * Modern Badge Component
 */
export const Badge = ({ text, variant = 'default', size = 'medium' }) => {
  return (
    <View
      style={[
        styles.badge,
        styles[`badge${size.charAt(0).toUpperCase() + size.slice(1)}`],
        styles[`badge${variant.charAt(0).toUpperCase() + variant.slice(1)}`],
      ]}
    >
      <Text
        style={[
          styles.badgeText,
          styles[`badgeText${size.charAt(0).toUpperCase() + size.slice(1)}`],
        ]}
      >
        {text}
      </Text>
    </View>
  );
};

/**
 * Modern Empty State Component
 */
export const EmptyState = ({ icon, title, message, action }) => {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateIcon}>{icon}</Text>
      <Text style={styles.emptyStateTitle}>{title}</Text>
      <Text style={styles.emptyStateMessage}>{message}</Text>
      {action && (
        <Button
          title={action.title}
          onPress={action.onPress}
          style={styles.emptyStateButton}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  // Card
  card: {
    backgroundColor: Colors.surface,
    borderRadius: radius.large,
    padding: spacing.md,
    marginBottom: spacing.md,
  },

  // Button Base
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.medium,
    paddingHorizontal: spacing.lg,
    ...shadows.small,
  },
  buttonMedium: {
    height: 48,
    paddingHorizontal: spacing.lg,
  },
  buttonSmall: {
    height: 40,
    paddingHorizontal: spacing.md,
  },
  buttonLarge: {
    height: 56,
    paddingHorizontal: spacing.xl,
  },
  buttonFullWidth: {
    width: '100%',
  },
  buttonDisabled: {
    opacity: 0.5,
  },

  // Button Variants
  buttonPrimary: {
    backgroundColor: Colors.primary,
  },
  buttonSecondary: {
    backgroundColor: Colors.secondary,
  },
  buttonOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  buttonGhost: {
    backgroundColor: 'transparent',
  },
  buttonDanger: {
    backgroundColor: Colors.danger,
  },
  buttonSuccess: {
    backgroundColor: Colors.success,
  },

  // Button Text
  buttonText: {
    ...typography.button,
    color: Colors.white,
  },
  buttonTextMedium: {
    fontSize: 16,
  },
  buttonTextSmall: {
    fontSize: 14,
  },
  buttonTextLarge: {
    fontSize: 18,
  },
  buttonTextOutline: {
    color: Colors.primary,
  },
  buttonTextGhost: {
    color: Colors.primary,
  },
  buttonTextDisabled: {
    color: Colors.textDisabled,
  },
  buttonIcon: {
    fontSize: 20,
    marginRight: spacing.sm,
  },

  // Stat Card
  statCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  statIconContainer: {
    width: 56,
    height: 56,
    borderRadius: radius.large,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  statIcon: {
    fontSize: 28,
  },
  statContent: {
    flex: 1,
  },
  statTitle: {
    ...typography.small,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  statValue: {
    ...typography.h3,
    marginBottom: 2,
  },
  statSubtitle: {
    ...typography.tiny,
    color: Colors.textTertiary,
  },

  // Badge
  badge: {
    alignSelf: 'flex-start',
    borderRadius: radius.small,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  badgeMedium: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  badgeSmall: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeLarge: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  badgeDefault: {
    backgroundColor: Colors.surfaceHover,
  },
  badgePrimary: {
    backgroundColor: Colors.primaryBg,
  },
  badgeSuccess: {
    backgroundColor: Colors.successBg,
  },
  badgeWarning: {
    backgroundColor: Colors.warningBg,
  },
  badgeDanger: {
    backgroundColor: Colors.dangerBg,
  },
  badgeText: {
    ...typography.tinySemibold,
    color: Colors.textPrimary,
  },
  badgeTextSmall: {
    fontSize: 10,
  },
  badgeTextMedium: {
    fontSize: 12,
  },
  badgeTextLarge: {
    fontSize: 14,
  },

  // Empty State
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  emptyStateIcon: {
    fontSize: 64,
    marginBottom: spacing.md,
    opacity: 0.4,
  },
  emptyStateTitle: {
    ...typography.h4,
    color: Colors.textPrimary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  emptyStateMessage: {
    ...typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  emptyStateButton: {
    marginTop: spacing.md,
  },
});
