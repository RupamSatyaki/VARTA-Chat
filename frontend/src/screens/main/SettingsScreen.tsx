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

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  footer: {
    padding: 20,
    alignItems: 'center',
    marginTop: 'auto',
  },
  version: {
    fontSize: 12,
    color: Colors.textSecondary,
    opacity: 0.6,
  },
});

export default SettingsScreen;
