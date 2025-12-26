import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import { supabase } from '../services/supabase';
import { useAuth } from '../components/auth/AuthProvider';

const { width: screenWidth } = Dimensions.get('window');

interface CreateNewScreenProps {
  navigation: any;
  route?: {
    params?: {
      selectedGroupId?: string | null;
      onPhotoAdded?: () => void;
    };
  };
}

const CreateNewScreen: React.FC<CreateNewScreenProps> = ({ navigation, route }) => {
  const selectedGroupId = route?.params?.selectedGroupId;
  const onPhotoAdded = route?.params?.onPhotoAdded;

  const { user } = useAuth();

  // Content type state
  const [contentType, setContentType] = useState<'image' | 'text'>('image');

  // Image state
  const [imageUri, setImageUri] = useState<string>('');
  const [imageFile, setImageFile] = useState<any>(null);
  const [rotation, setRotation] = useState(0);

  // Form state
  const [caption, setCaption] = useState('');
  const [textContent, setTextContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Album state
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedAlbums, setSelectedAlbums] = useState<Set<string>>(new Set());
  const [showAlbumInput, setShowAlbumInput] = useState(false);
  const [newAlbumName, setNewAlbumName] = useState('');

  // Fetch album suggestions
  useEffect(() => {
    fetchAlbumSuggestions();
  }, [user, selectedGroupId]);

  const fetchAlbumSuggestions = async () => {
    if (!user) return;

    try {
      let query = supabase.from('photos').select('hashtags');

      if (selectedGroupId) {
        query = query.eq('group_id', selectedGroupId);
      } else {
        query = query.eq('user_id', user.id).is('group_id', null);
      }

      const { data, error } = await query;
      if (error) throw error;

      const tags = new Set<string>();
      data?.forEach((photo: any) => {
        if (photo.hashtags && Array.isArray(photo.hashtags)) {
          photo.hashtags.forEach((tag: string) => {
            if (tag?.trim()) tags.add(tag.trim());
          });
        }
      });

      setSuggestions(Array.from(tags).sort((a, b) => a.localeCompare(b)));
    } catch (error) {
      console.error('Error fetching albums:', error);
    }
  };

  // Image picker
  const pickImage = async (useCamera: boolean = false) => {
    const options: any = {
      mediaType: 'photo',
      quality: 0.9,
      maxWidth: 1920,
      maxHeight: 1920,
    };

    try {
      const result = useCamera
        ? await launchCamera(options)
        : await launchImageLibrary(options);

      if (result.assets && result.assets[0]) {
        const asset = result.assets[0];
        setImageUri(asset.uri || '');
        setImageFile(asset);
        setRotation(0);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('خطأ', 'حدث خطأ أثناء اختيار الصورة');
    }
  };

  // Show image source picker
  const showImagePicker = () => {
    Alert.alert(
      'اختر مصدر الصورة',
      '',
      [
        { text: 'الكاميرا', onPress: () => pickImage(true) },
        { text: 'المعرض', onPress: () => pickImage(false) },
        { text: 'إلغاء', style: 'cancel' },
      ],
      { cancelable: true }
    );
  };

  // Rotate image
  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  // Album selection
  const toggleAlbum = (album: string) => {
    setSelectedAlbums((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(album)) {
        newSet.delete(album);
      } else {
        newSet.add(album);
      }
      return newSet;
    });
  };

  // Add new album
  const addNewAlbum = () => {
    const name = newAlbumName.trim();
    if (!name) {
      Alert.alert('خطأ', 'يرجى إدخال اسم الألبوم');
      return;
    }

    setSelectedAlbums((prev) => new Set(prev).add(name));
    if (!suggestions.includes(name)) {
      setSuggestions((prev) => [...prev, name].sort((a, b) => a.localeCompare(b)));
    }
    setNewAlbumName('');
    setShowAlbumInput(false);
  };

  // Submit
  const handleSubmit = async () => {
    if (!user) {
      Alert.alert('خطأ', 'يجب تسجيل الدخول أولاً');
      return;
    }

    if (contentType === 'image' && !imageUri) {
      Alert.alert('خطأ', 'يرجى اختيار صورة');
      return;
    }

    if (contentType === 'text' && !textContent.trim()) {
      Alert.alert('خطأ', 'يرجى كتابة نص الامتنان');
      return;
    }

    setIsSubmitting(true);

    try {
      let publicUrl = '';

      if (contentType === 'image' && imageFile) {
        // Upload image
        const fileExt = imageFile.fileName?.split('.').pop()?.toLowerCase() || 'jpg';
        const fileName = `${user.id}/photo_${Date.now()}.${fileExt}`;

        const formData = new FormData();
        formData.append('file', {
          uri: imageUri,
          name: fileName,
          type: imageFile.type || 'image/jpeg',
        } as any);

        const { error: uploadError, data: uploadData } = await supabase.storage
          .from('photos')
          .upload(fileName, formData, { cacheControl: '3600', upsert: false });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('photos')
          .getPublicUrl(uploadData.path);

        publicUrl = urlData.publicUrl;
      } else if (contentType === 'text') {
        // Generate text image (placeholder - you can implement TextToImage later)
        // For now, we'll save text as caption without image
        publicUrl = ''; // Or generate a placeholder image
      }

      // Check group membership if needed
      if (selectedGroupId) {
        const { data: membership, error: membershipError } = await supabase
          .from('group_members')
          .select('*')
          .eq('group_id', selectedGroupId)
          .eq('user_id', user.id)
          .single();

        if (membershipError || !membership) {
          throw new Error('ليس لديك صلاحية لإضافة صور إلى هذه المجموعة');
        }
      }

      // Insert photo record
      const { error: insertError } = await supabase.from('photos').insert({
        image_url: publicUrl,
        caption: contentType === 'text' ? textContent.trim() : caption.trim(),
        hashtags: Array.from(selectedAlbums),
        user_id: user.id,
        group_id: selectedGroupId || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      if (insertError) throw insertError;

      Alert.alert(
        '🎉 تمت الإضافة بنجاح',
        selectedGroupId
          ? 'تم إضافة الصورة إلى المجموعة'
          : 'تم إضافة الصورة بنجاح',
        [
          {
            text: 'حسناً',
            onPress: () => {
              onPhotoAdded?.();
              navigation.goBack();
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('Error submitting:', error);
      Alert.alert('خطأ', error.message || 'حدث خطأ أثناء الحفظ');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <LinearGradient colors={['#14090e', '#1a1a2e', '#16213e']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
            <Icon name="close" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {selectedGroupId ? 'إضافة امتنان للمجموعة' : 'إضافة امتنان جديد'}
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Content Type Selector */}
            <View style={styles.typeSelector}>
              <TouchableOpacity
                style={[styles.typeButton, contentType === 'image' && styles.typeButtonActive]}
                onPress={() => setContentType('image')}
              >
                <Icon
                  name="image-outline"
                  size={20}
                  color={contentType === 'image' ? '#fff' : 'rgba(255,255,255,0.6)'}
                />
                <Text
                  style={[styles.typeButtonText, contentType === 'image' && styles.typeButtonTextActive]}
                >
                  رفع صورة
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.typeButton, contentType === 'text' && styles.typeButtonActive]}
                onPress={() => setContentType('text')}
              >
                <Icon
                  name="text-outline"
                  size={20}
                  color={contentType === 'text' ? '#fff' : 'rgba(255,255,255,0.6)'}
                />
                <Text
                  style={[styles.typeButtonText, contentType === 'text' && styles.typeButtonTextActive]}
                >
                  امتنان كتابي
                </Text>
              </TouchableOpacity>
            </View>

            {/* Image Upload Section */}
            {contentType === 'image' && (
              <View style={styles.imageSection}>
                <TouchableOpacity
                  style={styles.imagePicker}
                  onPress={showImagePicker}
                  activeOpacity={0.8}
                >
                  {imageUri ? (
                    <View style={styles.imagePreviewContainer}>
                      <Image
                        source={{ uri: imageUri }}
                        style={[styles.imagePreview, { transform: [{ rotate: `${rotation}deg` }] }]}
                        resizeMode="contain"
                      />
                      {/* Edit buttons */}
                      <View style={styles.imageEditButtons}>
                        <TouchableOpacity style={styles.editButton} onPress={handleRotate}>
                          <Icon name="refresh-outline" size={18} color="#fff" />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.editButton} onPress={showImagePicker}>
                          <Icon name="camera-outline" size={18} color="#fff" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.imagePlaceholder}>
                      <Icon name="add-circle-outline" size={50} color="rgba(255,255,255,0.4)" />
                      <Text style={styles.imagePlaceholderText}>اضغط لاختيار صورة</Text>
                    </View>
                  )}
                </TouchableOpacity>

                {/* Caption Input */}
                {imageUri && (
                  <View style={styles.captionSection}>
                    <Text style={styles.inputLabel}>تعليق على الصورة (اختياري)</Text>
                    <TextInput
                      style={styles.captionInput}
                      placeholder="اكتب تعليقاً يصف الصورة..."
                      placeholderTextColor="rgba(255,255,255,0.4)"
                      value={caption}
                      onChangeText={setCaption}
                      textAlign="right"
                      multiline
                      numberOfLines={3}
                    />
                  </View>
                )}
              </View>
            )}

            {/* Text Content Section */}
            {contentType === 'text' && (
              <View style={styles.textSection}>
                <Text style={styles.inputLabel}>اكتب امتنانك</Text>
                <TextInput
                  style={styles.textContentInput}
                  placeholder="اكتب ما تشعر بالامتنان له اليوم..."
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  value={textContent}
                  onChangeText={setTextContent}
                  textAlign="right"
                  multiline
                  numberOfLines={6}
                />
              </View>
            )}

            {/* Albums Section */}
            {(imageUri || contentType === 'text') && (
              <View style={styles.albumsSection}>
                <Text style={styles.sectionTitle}>اختر ألبوماً</Text>

                {/* Album chips */}
                <View style={styles.albumChips}>
                  {suggestions.map((album) => (
                    <TouchableOpacity
                      key={album}
                      style={[styles.albumChip, selectedAlbums.has(album) && styles.albumChipSelected]}
                      onPress={() => toggleAlbum(album)}
                    >
                      <Text
                        style={[
                          styles.albumChipText,
                          selectedAlbums.has(album) && styles.albumChipTextSelected,
                        ]}
                      >
                        {album}
                      </Text>
                      {selectedAlbums.has(album) && (
                        <Icon name="checkmark" size={14} color="#fff" style={styles.checkIcon} />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Add new album */}
                {showAlbumInput ? (
                  <View style={styles.newAlbumContainer}>
                    <TextInput
                      style={styles.newAlbumInput}
                      placeholder="اسم الألبوم الجديد"
                      placeholderTextColor="rgba(255,255,255,0.4)"
                      value={newAlbumName}
                      onChangeText={setNewAlbumName}
                      textAlign="right"
                      autoFocus
                    />
                    <View style={styles.newAlbumButtons}>
                      <TouchableOpacity style={styles.addAlbumBtn} onPress={addNewAlbum}>
                        <Text style={styles.addAlbumBtnText}>إضافة</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.cancelAlbumBtn}
                        onPress={() => setShowAlbumInput(false)}
                      >
                        <Text style={styles.cancelAlbumBtnText}>إلغاء</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.newAlbumButton}
                    onPress={() => setShowAlbumInput(true)}
                  >
                    <Icon name="add" size={18} color="#818cf8" />
                    <Text style={styles.newAlbumButtonText}>ألبوم جديد</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Submit Button */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.submitButton,
              (isSubmitting || (!imageUri && contentType === 'image') || (!textContent && contentType === 'text')) &&
                styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={isSubmitting || (!imageUri && contentType === 'image') || (!textContent.trim() && contentType === 'text')}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Icon name="checkmark-circle" size={20} color="#fff" />
                <Text style={styles.submitButtonText}>حفظ الامتنان</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
};


const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  headerSpacer: {
    width: 40,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  // Type Selector
  typeSelector: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  typeButtonActive: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  typeButtonText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 15,
    fontWeight: '600',
  },
  typeButtonTextActive: {
    color: '#fff',
  },
  // Image Section
  imageSection: {
    marginBottom: 20,
  },
  imagePicker: {
    width: '100%',
    height: 220,
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: 'rgba(255,255,255,0.2)',
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  imagePreviewContainer: {
    flex: 1,
    position: 'relative',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  imageEditButtons: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholderText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 14,
    marginTop: 10,
  },
  // Caption Section
  captionSection: {
    marginTop: 16,
  },
  inputLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'right',
    marginBottom: 8,
  },
  captionInput: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: 14,
    color: '#fff',
    fontSize: 15,
    textAlignVertical: 'top',
    minHeight: 80,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  // Text Section
  textSection: {
    marginBottom: 20,
  },
  textContentInput: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: 14,
    color: '#fff',
    fontSize: 16,
    textAlignVertical: 'top',
    minHeight: 150,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    lineHeight: 24,
  },
  // Albums Section
  albumsSection: {
    marginTop: 10,
  },
  sectionTitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'right',
    marginBottom: 12,
  },
  albumChips: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  albumChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  albumChipSelected: {
    backgroundColor: 'rgba(34,197,94,0.3)',
    borderColor: '#22c55e',
  },
  albumChipText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    fontWeight: '500',
  },
  albumChipTextSelected: {
    color: '#fff',
  },
  checkIcon: {
    marginLeft: 6,
  },
  // New Album
  newAlbumButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(129,140,248,0.4)',
  },
  newAlbumButtonText: {
    color: '#818cf8',
    fontSize: 14,
    fontWeight: '600',
  },
  newAlbumContainer: {
    marginTop: 8,
  },
  newAlbumInput: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10,
    padding: 12,
    color: '#fff',
    fontSize: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    marginBottom: 10,
  },
  newAlbumButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  addAlbumBtn: {
    flex: 1,
    backgroundColor: '#3b82f6',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  addAlbumBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  cancelAlbumBtn: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelAlbumBtnText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    fontWeight: '600',
  },
  // Footer
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 30,
    backgroundColor: 'rgba(20,9,14,0.95)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#ea384c',
    paddingVertical: 16,
    borderRadius: 14,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
});

export default CreateNewScreen;
