import React, { useState } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  StatusBar,
  FlatList,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Colors } from '../../theme/colors';
import { useAuthStore } from '../../store/useAuthStore';

// Modular Components
import Header from '../../components/layout/Settings/Header';
import Profile from '../../components/layout/Settings/Profile';
import UserInfo from '../../components/layout/Settings/UserInfo';
import SettingsList from '../../components/layout/Settings/SettingsList';
import Dropdown from '../../components/layout/Settings/Dropdown';
import ProfileEditModal from '../../components/layout/Settings/ProfileEditModal';

const SettingsScreen: React.FC = () => {
  const navigation = useNavigation();
  const [isDropdownVisible, setIsDropdownVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const { userData, logout } = useAuthStore();

  const handleLogout = async () => {
    setIsDropdownVisible(false);
    await logout();
  };

  // Define sections for FlatList
  const sections = [
    { id: 'profile', component: <Profile user={userData} /> },
    { id: 'userInfo', component: <UserInfo user={userData} /> },
    { id: 'settingsList', component: <SettingsList /> },
    { 
      id: 'footer', 
      component: (
        <View style={styles.footer}>
          <Text style={styles.version}>VARTA v1.0.0</Text>
        </View>
      ) 
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.surface} />
      
      <Header 
        onClose={() => navigation.goBack()} 
        onMorePress={() => setIsDropdownVisible(!isDropdownVisible)}
        onEditPress={() => setIsEditModalVisible(true)}
      />
      
      <FlatList
        data={sections}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => item.component}
        contentContainerStyle={styles.listContent}
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={true}
        bounces={true}
        overScrollMode="always"
      />

      {/* Overlays */}
      <Dropdown 
        isVisible={isDropdownVisible} 
        onLogout={handleLogout} 
      />

      <ProfileEditModal 
        isVisible={isEditModalVisible} 
        onClose={() => setIsEditModalVisible(false)} 
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
    ...Platform.select({
      web: {
        height: '100vh',
        maxHeight: '100vh',
        overflow: 'hidden',
      },
      default: {
        flex: 1,
      }
    })
  },
  listContent: {
    paddingBottom: 40,
    flexGrow: 1,
    minHeight: '100%',
  },
  footer: {
    padding: 30,
    alignItems: 'center',
  },
  version: {
    fontSize: 12,
    color: Colors.textSecondary,
    opacity: 0.6,
  },
});

export default SettingsScreen;
