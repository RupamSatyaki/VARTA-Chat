import React from 'react';
import { StyleSheet, View, Text, ScrollView, Image, TouchableOpacity } from 'react-native';
import { Colors } from '../../../../theme/colors';

const DUMMY_MEDIA = [
  'https://images.unsplash.com/photo-1557683316-973673baf926?w=200',
  'https://images.unsplash.com/photo-1557683311-eac922347aa1?w=200',
  'https://images.unsplash.com/photo-1557683304-673a23048d34?w=200',
];

const MediaGallery: React.FC = () => {
  return (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {DUMMY_MEDIA.map((url, index) => (
        <TouchableOpacity key={index} style={styles.mediaItem} activeOpacity={0.8}>
          <Image source={{ uri: url }} style={styles.image} />
        </TouchableOpacity>
      ))}
      <TouchableOpacity style={styles.moreItem}>
        <Text style={styles.moreText}>+12</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingVertical: 5,
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
