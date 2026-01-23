import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Modal,
  SafeAreaView,
  Alert,
  Platform,
  Image,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Animated,
  Easing,
} from 'react-native';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import ImagePicker from 'react-native-image-crop-picker';
import { supabase } from '../src/services/supabase';
import { useAuth } from '../src/components/auth/AuthProvider';
import Icon from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import RNFS from 'react-native-fs';
import { decode as decodeBase64 } from 'base64-arraybuffer';
import { useToast } from '../src/providers/ToastProvider';

interface CreateNewDialogProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (content: string, imageUri?: string, hashtags?: string[]) => void;
  selectedGroupId?: string | null;
}

const CreateNewDialog: React.FC<CreateNewDialogProps> = ({
  visible,
  onClose,
  onSubmit,
  selectedGroupId,
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();

  // Content type
  const [contentType, setContentType] = useState<'image' | 'text'>('image');

  // Image state
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<any>(null);
  const [rotation, setRotation] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  // Form state
  const [caption, setCaption] = useState('');
  const [textContent, setTextContent] = useState('');

  // Album state
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedAlbums, setSelectedAlbums] = useState<Set<string>>(new Set());
  const [showAlbumInput, setShowAlbumInput] = useState(false);
  const [newAlbumName, setNewAlbumName] = useState('');

  // Animation for horizontal loader
  const scrollX = useRef(new Animated.Value(-1)).current;

  useEffect(() => {
    if (isUploading) {
      scrollX.setValue(0);
      Animated.loop(
        Animated.timing(scrollX, {
          toValue: 1,
          duration: 1500,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();
    }
  }, [isUploading]);

  const resetForm = useCallback(() => {
    setContentType('image');
    setImageUri(null);
    setImageFile(null);
    setRotation(0);
    setCaption('');
    setTextContent('');
    setSelectedAlbums(new Set());
    setShowAlbumInput(false);
    setNewAlbumName('');
  }, []);

  // Fetch album suggestions
  const fetchAlbumSuggestions = useCallback(async () => {
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
  }, [user, selectedGroupId]);

  // Reset form when modal opens
  useEffect(() => {
    if (visible) {
      resetForm();
      fetchAlbumSuggestions();
    }
  }, [visible, resetForm, fetchAlbumSuggestions]);

  // Image picker
  const pickImage = async (useCamera: boolean = false) => {
    const options: any = {
      mediaType: 'photo',
      quality: 0.6, // تقليل الجودة من 0.9 إلى 0.6 لتوفير مساحة في قاعدة البيانات
      maxWidth: 1200, // تقليل الأبعاد القصوى من 1920 إلى 1200
      maxHeight: 1200,
    };

    try {
      const result = useCamera
        ? await launchCamera(options)
        : await launchImageLibrary(options);

      if (result.assets && result.assets[0]) {
        const asset = result.assets[0];
        setImageUri(asset.uri || null);
        setImageFile(asset);
        setRotation(0);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      showToast({ message: 'حدث خطأ أثناء اختيار الصورة', type: 'error' });
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

  // Crop image
  const handleCrop = async () => {
    if (!imageUri) return;

    try {
      const croppedImage = await ImagePicker.openCropper({
        path: imageUri,
        width: 1200,
        height: 1200,
        cropping: true,
        freeStyleCropEnabled: true,
        mediaType: 'photo',
        compressImageQuality: 0.6,
      });

      if (croppedImage) {
        setImageUri(croppedImage.path);
        setImageFile({
          uri: croppedImage.path,
          fileName: croppedImage.path.split('/').pop(),
          type: croppedImage.mime,
        });
        setRotation(0);
      }
    } catch (error: any) {
      if (error.message !== 'User cancelled image selection') {
        console.error('Error cropping image:', error);
        showToast({ message: 'حدث خطأ أثناء قص الصورة', type: 'error' });
      }
    }
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
      showToast({ message: 'يرجى إدخال اسم الألبوم', type: 'error' });
      return;
    }

    setSelectedAlbums((prev) => new Set(prev).add(name));
    if (!suggestions.includes(name)) {
      setSuggestions((prev) => [...prev, name].sort((a, b) => a.localeCompare(b)));
    }
    setNewAlbumName('');
    setShowAlbumInput(false);
  };

  // Upload image
  const uploadImage = async (uri: string): Promise<string | null> => {
    if (!user) return null;

    try {
      const fileExt = imageFile?.fileName?.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${user.id}/photo_${Date.now()}.${fileExt}`;

      const normalizedUri = uri.startsWith('file://') ? uri : uri;
      const base64Data = await RNFS.readFile(normalizedUri, 'base64');
      const arrayBuffer = decodeBase64(base64Data);

      const { data, error } = await supabase.storage
        .from('photos')
        .upload(fileName, arrayBuffer, {
          contentType: imageFile?.type || 'image/jpeg',
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        console.error('Upload error details:', error);
        throw error;
      }

      const { data: urlData } = supabase.storage
        .from('photos')
        .getPublicUrl(data.path);

      return urlData.publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      return null;
    }
  };

  // Submit
  const handleSubmit = async () => {
    if (contentType === 'image' && !imageUri) {
      Alert.alert('خطأ', 'يرجى اختيار صورة');
      return;
    }

    if (contentType === 'text' && !textContent.trim()) {
      Alert.alert('خطأ', 'يرجى كتابة نص الامتنان');
      return;
    }

    setIsUploading(true);

    try {
      let finalImageUri = imageUri;

      // تطبيق الدوران إذا كان موجوداً
      if (contentType === 'image' && imageUri && rotation !== 0) {
        try {
          const rotatedImage = await ImagePicker.openCropper({
            path: imageUri,
            width: imageFile?.width || 1200,
            height: imageFile?.height || 1200,
            rotation: rotation,
            mediaType: 'photo',
            compressImageQuality: 0.6,
          });
          if (rotatedImage) {
            finalImageUri = rotatedImage.path;
          }
        } catch (rotateError) {
          console.error('Error applying rotation before upload:', rotateError);
          // نواصل باستخدام الصورة الأصلية إذا فشل الدوران التلقائي
        }
      }

      let uploadedImageUrl: string | undefined;

      if (contentType === 'image' && finalImageUri) {
        const url = await uploadImage(finalImageUri);
        if (url) {
          uploadedImageUrl = url;
        } else {
          Alert.alert('خطأ', 'فشل رفع الصورة');
          setIsUploading(false);
          return;
        }
      }

      const content = contentType === 'text' ? textContent.trim() : caption.trim();
      const hashtags = Array.from(selectedAlbums);

      // إذا كان من نوع نص، نرسل سلسلة فارغة للصورة لتجنب قيود قاعدة البيانات
      onSubmit(content, contentType === 'text' ? '' : uploadedImageUrl, hashtags);
      showToast({ message: 'تم نشر الصورة بنجاح', type: 'success' });
      resetForm();
      onClose();
    } catch (error) {
      console.error('Error submitting:', error);
      showToast({ message: 'حدث خطأ أثناء الحفظ', type: 'error' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'overFullScreen'}
      onRequestClose={handleClose}
      transparent={Platform.OS !== 'ios'}
    >
      <View style={Platform.OS === 'ios' ? styles.iosContainer : styles.androidOverlay}>
        <LinearGradient
          colors={['#14090e', '#1a1a2e', '#16213e']}
          style={styles.gradientContainer}
        >
          <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity onPress={handleClose} style={styles.headerButton}>
                <Icon name="close" size={24} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.title}>
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
                keyboardShouldPersistTaps="handled"
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
                            <TouchableOpacity style={styles.editButton} onPress={handleCrop}>
                              <Icon name="crop-outline" size={18} color="#fff" />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.editButton} onPress={handleRotate}>
                              <Icon name="refresh-outline" size={18} color="#fff" />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.editButton} onPress={showImagePicker}>
                              <Icon name="camera-outline" size={18} color="#fff" />
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[styles.editButton, styles.removeButton]}
                              onPress={() => {
                                setImageUri(null);
                                setImageFile(null);
                              }}
                            >
                              <Icon name="trash-outline" size={18} color="#fff" />
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
                        <Text style={styles.inputLabel}>وصف الصورة (اختياري)</Text>
                        <TextInput
                          style={styles.captionInput}
                          placeholder="اكتب وصفاً للصورة..."
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
                    <Text style={styles.sectionTitle}>اختر ألبوماً (اختياري)</Text>

                    {/* Album chips */}
                    {suggestions.length > 0 && (
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
                    )}

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
                  (isUploading ||
                    (!imageUri && contentType === 'image') ||
                    (!textContent.trim() && contentType === 'text')) &&
                    styles.submitButtonDisabled,
                ]}
                onPress={handleSubmit}
                disabled={
                  isUploading ||
                  (!imageUri && contentType === 'image') ||
                  (!textContent.trim() && contentType === 'text')
                }
              >
                {isUploading ? (
                  <View style={styles.horizontalLoaderContainer}>
                    <View style={styles.horizontalLoaderTrack}>
                      <Animated.View
                        style={[
                          styles.horizontalLoaderBar,
                          {
                            width: 150,
                            transform: [{
                              translateX: scrollX.interpolate({
                                inputRange: [0, 1],
                                outputRange: [-150, 300]
                              })
                            }]
                          }
                        ]}
                      >
                        <LinearGradient
                          colors={['transparent', '#ea384c', 'transparent']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={{ flex: 1 }}
                        />
                      </Animated.View>
                    </View>
                  </View>
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
      </View>
    </Modal>
  );
};


const styles = StyleSheet.create({
  iosContainer: {
    flex: 1,
  },
  androidOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  gradientContainer: {
    flex: 1,
  },
  container: {
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
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
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
  removeButton: {
    backgroundColor: 'rgba(234,56,76,0.8)',
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
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 30 : 16,
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
    fontSize: 16,
    fontWeight: '700',
  },
  // Horizontal Loader Styles
  horizontalLoaderContainer: {
    width: 120,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  horizontalLoaderTrack: {
    width: 300,
    height: 3,
    backgroundColor: 'transparent',
    borderRadius: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  horizontalLoaderBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: '100%',
  },
});

export default CreateNewDialog;
