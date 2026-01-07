import React, { useState } from 'react';
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
} from 'react-native';
import { Colors, Spacing, Typography, BorderRadius } from '../../theme';
import { useToast } from '../providers/ToastProvider';

interface CreateNewDialogProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (content: string) => void;
}

const CreateNewDialog: React.FC<CreateNewDialogProps> = ({
  visible,
  onClose,
  onSubmit,
}) => {
  const [content, setContent] = useState('');
  const { showToast } = useToast();

  const handleSubmit = () => {
    if (content.trim().length === 0) {
      showToast({ message: 'يرجى كتابة محتوى اللحظة', type: 'warning' });
      return;
    }

    onSubmit(content.trim());
    setContent('');
    onClose();
  };

  const handleClose = () => {
    setContent('');
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
        <SafeAreaView style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={handleClose}>
              <Text style={styles.cancelButton}>إلغاء</Text>
            </TouchableOpacity>
            
            <Text style={styles.title}>لحظة جديدة</Text>
            
            <TouchableOpacity onPress={handleSubmit}>
              <Text style={styles.submitButton}>حفظ</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            <Text style={styles.label}>شاركنا لحظتك الجميلة</Text>
            
            <TextInput
              style={styles.textInput}
              placeholder="اكتب عن لحظتك السعيدة..."
              placeholderTextColor={Colors.textMuted}
              value={content}
              onChangeText={setContent}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              autoFocus
            />
            
            <Text style={styles.hint}>
              شارك اللحظات الجميلة والنعم في حياتك
            </Text>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  iosContainer: {
    flex: 1,
    backgroundColor: Colors.authGradientMiddle, // Fallback background
  },
  androidOverlay: {
    flex: 1,
    backgroundColor: Colors.glassBlack,
    justifyContent: 'flex-end',
  },
  container: {
    flex: 1,
    backgroundColor: Platform.OS === 'ios' ? Colors.authGradientStart : Colors.glassCard,
    borderTopLeftRadius: Platform.OS === 'android' ? BorderRadius.xxl : 0,
    borderTopRightRadius: Platform.OS === 'android' ? BorderRadius.xxl : 0,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    backgroundColor: Colors.glassHeader,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  cancelButton: {
    color: Colors.textSecondary,
    fontSize: Typography.body.fontSize,
  },
  title: {
    fontSize: Typography.h3.fontSize,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  submitButton: {
    color: Colors.primary,
    fontSize: Typography.body.fontSize,
    fontWeight: '700',
  },
  content: {
    padding: Spacing.xl,
    flex: 1,
  },
  label: {
    fontSize: Typography.h4.fontSize,
    color: Colors.textPrimary,
    marginBottom: Spacing.lg,
    fontWeight: '600',
    textAlign: 'center',
  },
  textInput: {
    backgroundColor: Colors.glassInput,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    fontSize: Typography.body.fontSize,
    color: Colors.textPrimary,
    minHeight: 150,
    marginBottom: Spacing.lg,
    textAlign: 'right',
    borderWidth: 1,
    borderColor: Colors.borderLighter,
  },
  hint: {
    color: Colors.textMuted,
    fontSize: Typography.caption.fontSize,
    textAlign: 'center',
  },
});

export default CreateNewDialog;
