import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';

interface PhotoCardProps {
  id: string;
  content: string;
  author?: string;
  timestamp: string;
  onPress?: () => void;
}

const { width } = Dimensions.get('window');
const cardWidth = (width - 48) / 2; // 2 columns with 16px margins

const PhotoCard: React.FC<PhotoCardProps> = ({
  id: _id,
  content,
  author,
  timestamp,
  onPress,
}) => {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={styles.content}>
        <Text style={styles.contentText} numberOfLines={4}>
          {content}
        </Text>
      </View>
      
      <View style={styles.footer}>
        {author && (
          <Text style={styles.author} numberOfLines={1}>
            {author}
          </Text>
        )}
        <Text style={styles.timestamp}>{timestamp}</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    width: cardWidth,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  content: {
    minHeight: 80,
    justifyContent: 'center',
  },
  contentText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    textAlign: 'center',
  },
  footer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  author: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
    marginBottom: 4,
  },
  timestamp: {
    fontSize: 10,
    color: '#999',
  },
});

export default PhotoCard;
