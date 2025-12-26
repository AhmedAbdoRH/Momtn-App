import React from 'react';
import {
  View,
  FlatList,
  StyleSheet,
} from 'react-native';
import PhotoCard from './PhotoCard';

interface Photo {
  id: string;
  content: string;
  author?: string;
  timestamp: string;
}

interface PhotoGridProps {
  photos: Photo[];
  onPhotoPress?: (photo: Photo) => void;
}

const PhotoGrid: React.FC<PhotoGridProps> = ({ photos, onPhotoPress }) => {
  const renderPhoto = ({ item, index }: { item: Photo; index: number }) => (
    <View style={[styles.photoContainer, index % 2 === 1 && styles.rightColumn]}>
      <PhotoCard
        id={item.id}
        content={item.content}
        author={item.author}
        timestamp={item.timestamp}
        onPress={() => onPhotoPress?.(item)}
      />
    </View>
  );

  return (
    <FlatList
      data={photos}
      renderItem={renderPhoto}
      keyExtractor={(item) => item.id}
      numColumns={2}
      columnWrapperStyle={styles.row}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  row: {
    justifyContent: 'space-between',
  },
  photoContainer: {
    flex: 1,
  },
  rightColumn: {
    marginLeft: 16,
  },
});

export default PhotoGrid;