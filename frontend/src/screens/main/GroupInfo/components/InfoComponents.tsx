import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../../theme/colors';
import { IconName } from '../types';

export const SectionHeader: React.FC<{ title: string; count?: number; onPress?: () => void }> = ({ title, count, onPress }) => (
  <View style={styles.sectionHeader}>
    <Text style={styles.sectionTitle}>{title} {count !== undefined && <Text style={styles.countText}>({count})</Text>}</Text>
    {onPress && (
      <TouchableOpacity onPress={onPress}>
        <Text style={styles.seeAll}>See All</Text>
      </TouchableOpacity>
    )}
  </View>
);

export const InfoCard: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <View style={styles.card}>{children}</View>
);

export const ActionButton: React.FC<{ icon: IconName; label: string; color?: string; onPress?: () => void }> = ({ icon, label, color = Colors.primary, onPress }) => (
  <TouchableOpacity style={styles.actionBtn} onPress={onPress} activeOpacity={0.7}>
    <View style={[styles.iconCircle, { backgroundColor: `${color}15` }]}>
      <Ionicons name={icon} size={22} color={color} />
    </View>
    <Text style={[styles.actionLabel, { color }]}>{label}</Text>
  </TouchableOpacity>
);

export const SettingItem: React.FC<{ icon: IconName; title: string; subtitle?: string; color?: string; onPress?: () => void; value?: React.ReactNode }> = ({ icon, title, subtitle, color = Colors.text, onPress, value }) => (
  <TouchableOpacity style={styles.settingItem} onPress={onPress} activeOpacity={0.6}>
    <View style={[styles.settingIcon, { backgroundColor: `${color}10` }]}>
      <Ionicons name={icon} size={20} color={color} />
    </View>
    <View style={styles.settingContent}>
      <Text style={[styles.settingTitle, { color: Colors.text }]}>{title}</Text>
      {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
    </View>
    {value || <Ionicons name="chevron-forward" size={18} color={Colors.gray} />}
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
    marginTop: 25,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  countText: {
    color: Colors.textSecondary,
    fontSize: 13,
  },
  seeAll: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    marginHorizontal: 16,
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  actionBtn: {
    alignItems: 'center',
    width: 80,
  },
  iconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  settingIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  settingSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});
