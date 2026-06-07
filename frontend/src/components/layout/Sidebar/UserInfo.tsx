import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../theme/colors';

interface UserInfoProps {
  user: any;
}

const UserInfo: React.FC<UserInfoProps> = ({ user }) => {
  const infoItems = [
    {
      icon: 'call-outline' as const,
      value: user?.number || 'N/A',
      label: 'phone',
    },
    {
      icon: 'person-outline' as const,
      value: user?.username || user?.name || 'N/A',
      label: user?.username ? `@${user.username}` : 'username',
    },
    {
      icon: 'calendar-outline' as const,
      value: user?.birthday || 'Not set',
      label: 'birthday',
    },
  ];

  return (
    <View style={styles.container}>
      {infoItems.map((item, index) => (
        <View key={index} style={[styles.item, index === infoItems.length - 1 && styles.lastItem]}>
          <View style={styles.iconWrapper}>
            <Ionicons name={item.icon} size={22} color={Colors.primary} />
          </View>
          <View style={styles.content}>
            <Text style={styles.value}>{item.value}</Text>
            <Text style={styles.label}>{item.label}</Text>
          </View>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 15,
    marginVertical: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 20,
    padding: 15,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  lastItem: {
    marginBottom: 0,
  },
  iconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(138, 43, 226, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    marginLeft: 15,
    flex: 1,
  },
  value: {
    fontSize: 16,
    color: Colors.text,
    fontWeight: '600',
  },
  label: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});

export default UserInfo;
