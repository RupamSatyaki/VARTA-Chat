import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, ScrollView, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Colors } from '../../../../theme/colors';
import apiClient from '../../../../api/apiClient';

const MediaGallery: React.FC<{ chatId: string }> = ({ chatId }) => {
  const navigation = useNavigation();
  const [media, setMedia] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    const fetchMedia = async () => {
      try {
        const response = await apiClient.get(`/messages/media/${chatId}`);
        if (response.data.success) {
          setMedia(response.data.data.media.slice(0, 5));
          const { media: m, links, docs } = response.data.data;
          setTotalCount(m.length + links.length + docs.length);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchMedia();
  }, [chatId]);

  if (loading) {
    return <ActivityIndicator style={{ marginVertical: 20 }} color={Colors.primary} />;
  }

  if (media.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No media shared yet</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {media.map((item, index) => (
        <TouchableOpacity key={item._id} style={styles.mediaItem} activeOpacity={0.8}>
          <Image source={{ uri: item.content }} style={styles.image} />
        </TouchableOpacity>
      ))}
      {totalCount > 5 && (
        <TouchableOpacity 
          style={styles.moreItem}
          onPress={() => navigation.navigate('SharedMedia' as never, { chatId } as never)}
        >
          <Text style={styles.moreText}>+{totalCount - 5}</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingVertical: 5,
  },
  emptyContainer: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  emptyText: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  mediaItem: {
    width: 90,
    height: 90,
    borderRadius: 16,
    marginRight: 10,
    overflow: 'hidden',
    backgroundColor: Colors.surface,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  moreItem: {
    width: 90,
    height: 90,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  moreText: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default MediaGallery;
