import React, { useState } from 'react';
import { 
  StyleSheet, 
  View, 
  Dimensions, 
  Platform,
  Text,
  ScrollView,
  StatusBar
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Colors } from '../../theme/colors';
import { useAuthStore } from '../../store/useAuthStore';

// Modular Components from Sidebar
import Header from '../../components/layout/Sidebar/Header';
import Profile from '../../components/layout/Sidebar/Profile';
import UserInfo from '../../components/layout/Sidebar/UserInfo';
import SettingsList from '../../components/layout/Sidebar/SettingsList';
import Dropdown from '../../components/layout/Sidebar/Dropdown';
import ProfileEditModal from '../../components/layout/Sidebar/ProfileEditModal';

const SettingsScreen: React.FC = () => {
  const navigation = useNavigation();
  const [isDropdownVisible, setIsDropdownVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const { userData, logout } = useAuthStore();

  const handleLogout = async () => {
    setIsDropdownVisible(false);
    await logout();
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.surface} />
      
      <View style={{ zIndex: 10 }}>
        <Header 
          onClose={() => navigation.goBack()} 
          onMorePress={() => setIsDropdownVisible(!isDropdownVisible)}
          onEditPress={() => setIsEditModalVisible(true)}
        />
        
        <Dropdown 
          isVisible={isDropdownVisible} 
          onLogout={handleLogout} 
        />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <Profile user={userData} />

        <UserInfo user={userData} />

        <SettingsList />

        <View style={styles.footer}>
          <Text style={styles.version}>VARTA v1.0.0</Text>
        </View>
      </ScrollView>

      {/* Profile Edit Modal */}
      <ProfileEditModal 
        isVisible={isEditModalVisible} 
        onClose={() => setIsEditModalVisible(false)} 
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  version: {
    fontSize: 12,
    color: Colors.textSecondary,
    opacity: 0.6,
  },
});

export default SettingsScreen;
