// Common UI components - Clean & Minimal
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Colors from '../styles/colors';

export function Card({ children, style }) {
  return <View style={[cs.card, style]}>{children}</View>;
}

export function Button({ title, onPress, variant = 'primary', icon, disabled, style }) {
  const bg = variant === 'danger' ? Colors.danger : variant === 'outline' ? 'transparent' : Colors.primary;
  const textColor = variant === 'outline' ? Colors.primary : Colors.white;
  const borderColor = variant === 'outline' ? Colors.primary : 'transparent';
  return (
    <TouchableOpacity style={[cs.btn, { backgroundColor: bg, borderColor, borderWidth: variant === 'outline' ? 1 : 0 }, disabled && { opacity: 0.5 }, style]}
      onPress={onPress} disabled={disabled} activeOpacity={0.7}>
      {icon && <MaterialCommunityIcons name={icon} size={18} color={textColor} />}
      <Text style={[cs.btnText, { color: textColor }]}>{title}</Text>
    </TouchableOpacity>
  );
}

export function StatCard({ icon, iconColor, iconBg, value, label, onPress }) {
  return (
    <TouchableOpacity style={cs.statCard} onPress={onPress} activeOpacity={0.7}>
      <View style={[cs.statIcon, { backgroundColor: iconBg }]}>
        <MaterialCommunityIcons name={icon} size={22} color={iconColor} />
      </View>
      <Text style={cs.statValue}>{value}</Text>
      <Text style={cs.statLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

export function Badge({ text, variant = 'primary' }) {
  const colors = { primary: [Colors.primaryLight, Colors.primary], danger: [Colors.dangerBg, Colors.danger], warning: [Colors.warningBg, Colors.warning], success: [Colors.successBg, Colors.success] };
  const [bg, fg] = colors[variant] || colors.primary;
  return <View style={[cs.badge, { backgroundColor: bg }]}><Text style={[cs.badgeText, { color: fg }]}>{text}</Text></View>;
}

export function EmptyState({ icon, title, description, actionLabel, onAction }) {
  return (
    <View style={cs.empty}>
      <MaterialCommunityIcons name={icon} size={56} color={Colors.textLight} />
      <Text style={cs.emptyTitle}>{title}</Text>
      {description && <Text style={cs.emptyDesc}>{description}</Text>}
      {actionLabel && onAction && (
        <TouchableOpacity style={cs.emptyBtn} onPress={onAction} activeOpacity={0.7}>
          <Text style={cs.emptyBtnText}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const cs = StyleSheet.create({
  card: { backgroundColor: Colors.white, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: Colors.cardBorder },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 20 },
  btnText: { fontSize: 15, fontWeight: '600' },
  statCard: { flex: 1, borderRadius: 14, padding: 16 },
  statIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  statValue: { fontSize: 24, fontWeight: '700', color: Colors.textDark, marginBottom: 2 },
  statLabel: { fontSize: 12, fontWeight: '500', color: Colors.textSecondary },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  empty: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: Colors.textDark, marginTop: 16, marginBottom: 6 },
  emptyDesc: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center', lineHeight: 19, marginBottom: 20 },
  emptyBtn: { backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 24 },
  emptyBtnText: { fontSize: 14, fontWeight: '600', color: Colors.white },
});
