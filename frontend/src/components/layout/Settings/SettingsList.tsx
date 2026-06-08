import React from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import MenuItem from './MenuItem';
import { Colors } from '../../../theme/colors';

const SettingsList: React.FC = () => {
  const settingsItems = [
    { icon: 'settings-outline' as const, title: 'General Settings' },
    { icon: 'speedometer-outline' as const, title: 'Animations and Performance' },
    { icon: 'notifications-outline' as const, title: 'Notifications' },
    { icon: 'server-outline' as const, title: 'Data and Storage' },
    { icon: 'lock-closed-outline' as const, title: 'Privacy and Security' },
    { icon: 'folder-open-outline' as const, title: 'Chat Folders' },
    { icon: 'devices-outline' as const, title: 'Active Sessions' },
    { icon: 'language-outline' as const, title: 'Language' },
    { icon: 'happy-outline' as const, title: 'Stickers and Emojis' },
  ];

  return (
    <View style={styles.container}>
      {settingsItems.map((item, index) => (
        <MenuItem 
          key={index}
          icon={item.icon}
          title={item.title}
          onPress={() => console.log(`${item.title} pressed`)}
        />
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
    paddingVertical: 10,
  },
});

export default SettingsList;
