import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  FlatList, 
  Image, 
  Dimensions, 
  ActivityIndicator,
  Linking,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Colors } from '../../theme/colors';
import apiClient from '../../api/apiClient';

const { width } = Dimensions.get('window');
const COLUMN_COUNT = 3;
const ITEM_SIZE = width / COLUMN_COUNT;

type TabType = 'Media' | 'Links' | 'Docs';

const SharedMediaScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const { chatId, chatName } = route.params;

  const [activeTab, setActiveTab] = useState<TabType>('Media');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{ media: any[], links: any[], docs: any[] }>({
    media: [],
    links: [],
    docs: []
  });

  useEffect(() => {
    fetchMedia();
  }, [chatId]);

  const fetchMedia = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/messages/media/${chatId}`);
      if (response.data.success) {
        setData(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching media:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderMediaItem = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.mediaItem}>
      <Image source={{ uri: item.content }} style={styles.mediaImage} />
    </TouchableOpacity>
  );

  const renderLinkItem = ({ item }: { item: any }) => {
    const preview = item.linkPreview;
    return (
      <TouchableOpacity 
        style={styles.linkItem}
        onPress={() => Linking.openURL(preview.url)}
      >
        <View style={styles.linkIconContainer}>
          {preview.image ? (
            <Image source={{ uri: preview.image }} style={styles.linkThumb} />
          ) : (
            <Ionicons name="link" size={24} color={Colors.primary} />
          )}
        </View>
        <View style={styles.linkTextContainer}>
          <Text style={styles.linkTitle} numberOfLines={1}>{preview.title || preview.url}</Text>
          <Text style={styles.linkUrl} numberOfLines={1}>{preview.url}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={Colors.gray} />
      </TouchableOpacity>
    );
  };

  const renderDocItem = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.docItem}>
      <View style={styles.docIconContainer}>
        <Ionicons name="document-text" size={28} color={Colors.primary} />
      </View>
      <View style={styles.docTextContainer}>
        <Text style={styles.docTitle} numberOfLines={1}>{item.content.split('/').pop()}</Text>
        <Text style={styles.docInfo}>
          {new Date(item.createdAt).toLocaleDateString()}
        </Text>
      </View>
      <Ionicons name="download-outline" size={20} color={Colors.gray} />
    </TouchableOpacity>
  );

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      );
    }

    const currentData = activeTab === 'Media' ? data.media : activeTab === 'Links' ? data.links : data.docs;

    if (currentData.length === 0) {
      return (
        <View style={styles.centerContainer}>
          <Ionicons 
            name={activeTab === 'Media' ? 'images-outline' : activeTab === 'Links' ? 'link-outline' : 'document-outline'} 
            size={60} 
            color={Colors.gray} 
          />
          <Text style={styles.emptyText}>No {activeTab.toLowerCase()} found</Text>
        </View>
      );
    }

    return (
      <FlatList
        data={currentData}
        keyExtractor={(item) => item._id}
        renderItem={activeTab === 'Media' ? renderMediaItem : activeTab === 'Links' ? renderLinkItem : renderDocItem}
        numColumns={activeTab === 'Media' ? COLUMN_COUNT : 1}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    );
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.header} edges={['top']}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {chatName || 'Shared Content'}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.tabBar}>
          {(['Media', 'Links', 'Docs'] as TabType[]).map((tab) => (
            <TouchableOpacity 
              key={tab}
              style={[styles.tab, activeTab === tab && styles.activeTab]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </SafeAreaView>

      <View style={styles.content}>
        {renderContent()}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    backgroundColor: Colors.surface,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    flex: 1,
    textAlign: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 10,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: Colors.primary,
  },
  tabText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  activeTabText: {
    color: Colors.primary,
  },
  content: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    color: Colors.gray,
    marginTop: 15,
    fontSize: 16,
  },
  listContent: {
    paddingBottom: 20,
  },
  mediaItem: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    padding: 1,
  },
  mediaImage: {
    width: '100%',
    height: '100%',
  },
  linkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  linkIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.03)',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  linkThumb: {
    width: '100%',
    height: '100%',
  },
  linkTextContainer: {
    flex: 1,
    marginLeft: 15,
  },
  linkTitle: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  linkUrl: {
    color: Colors.primary,
    fontSize: 13,
  },
  docItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  docIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: 'rgba(138, 43, 226, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  docTextContainer: {
    flex: 1,
    marginLeft: 15,
  },
  docTitle: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  docInfo: {
    color: Colors.textSecondary,
    fontSize: 12,
  },
});

export default SharedMediaScreen;