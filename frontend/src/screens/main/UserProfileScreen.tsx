import React from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  Image, 
  TouchableOpacity, 
  ScrollView, 
  StatusBar,
  Dimensions,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Colors } from '../../theme/colors';
import apiClient from '../../api/apiClient';
import { SectionHeader } from './GroupInfo/components/InfoComponents';
import MediaGallery from './GroupInfo/components/MediaGallery';

const { width } = Dimensions.get('window');

const UserProfileScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const { user, chat } = route.params;
  const [mediaCount, setMediaCount] = React.useState(0);

  const fetchMediaCount = async () => {
    if (!chat?._id) return;
    try {
      const response = await apiClient.get(`/messages/media/${chat._id}`);
      if (response.data.success) {
        const { media, links, docs } = response.data.data;
        setMediaCount(media.length + links.length + docs.length);
      }
    } catch (error) {
      console.error(error);
    }
  };

  React.useEffect(() => {
    fetchMediaCount();
  }, [chat?._id]);

  const renderInfoItem = (icon: any, label: string, value: string) => (
    <View style={styles.infoItem}>
      <View style={styles.iconCircle}>
        <Ionicons name={icon} size={22} color={Colors.primary} />
      </View>
      <View style={styles.infoText}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      
      <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
        {/* Profile Image & Back Button Header */}
        <View style={styles.imageHeader}>
          <Image 
            source={{ uri: user.profilePic || 'https://cdn-icons-png.flaticon.com/512/149/149071.png' }} 
            style={styles.profilePic} 
            resizeMode="cover"
          />
          <View style={styles.headerOverlay}>
            <SafeAreaView edges={['top']}>
              <TouchableOpacity 
                onPress={() => navigation.goBack()} 
                style={styles.backBtn}
              >
                <Ionicons name="arrow-back" size={24} color={Colors.white} />
              </TouchableOpacity>
            </SafeAreaView>
            
            <View style={styles.nameContainer}>
              <Text style={styles.userName}>{user.name || 'User'}</Text>
              <Text style={styles.userStatus}>Online</Text>
            </View>
          </View>
        </View>

        {/* Info Content */}
        <View style={styles.content}>
          {/* Bio Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About</Text>
            <Text style={styles.bioText}>
              {user.bio || "Hey there! I am using VARTA."}
            </Text>
          </View>

          <View style={styles.divider} />

          {/* Details Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Details</Text>
            {renderInfoItem('call-outline', 'Phone Number', user.number)}
            {user.username && renderInfoItem('person-outline', 'Username', `@${user.username}`)}
            {renderInfoItem('notifications-outline', 'Notifications', 'Muted')}
          </View>

          <View style={styles.divider} />

          {/* Shared Media Section */}
          <SectionHeader 
            title="Media, Links, and Docs" 
            count={mediaCount} 
            onPress={() => navigation.navigate('SharedMedia' as never, { chatId: chat?._id, chatName: user.name || user.number } as never)}
          />
          <MediaGallery chatId={chat?._id} />

          <View style={styles.divider} />

          {/* Actions Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Actions</Text>
            
            <TouchableOpacity style={styles.actionItem}>
              <Ionicons name="ban-outline" size={22} color={Colors.error} />
              <Text style={[styles.actionText, { color: Colors.error }]}>Block User</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionItem}>
              <Ionicons name="trash-outline" size={22} color={Colors.error} />
              <Text style={[styles.actionText, { color: Colors.error }]}>Clear Chat</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
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
  imageHeader: {
    width: width,
    height: width * 1.1,
    position: 'relative',
  },
  profilePic: {
    width: '100%',
    height: '100%',
  },
  headerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'space-between',
    padding: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  nameContainer: {
    paddingBottom: 20,
  },
  userName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.white,
    textShadow: '0px 2px 4px rgba(0,0,0,0.5)',
  },
  userStatus: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
    textShadow: '0px 1px 2px rgba(0,0,0,0.5)',
  },
  content: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    marginTop: -30,
    paddingTop: 30,
    paddingBottom: 40,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 15,
  },
  bioText: {
    fontSize: 16,
    color: Colors.text,
    lineHeight: 24,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(138, 43, 226, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoText: {
    marginLeft: 15,
  },
  infoLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    color: Colors.text,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginVertical: 10,
    marginHorizontal: 20,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
  },
  actionText: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
    marginLeft: 15,
  },
});

export default UserProfileScreen;
