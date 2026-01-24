import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  TextInput,
  Modal,
} from 'react-native';
import HorizontalLoader from '../components/ui/HorizontalLoader';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { useBackground } from '../providers/BackgroundProvider';
import { GroupsService, Group } from '../services/groups';
import CustomAlertDialog from '../components/CustomAlertDialog';

const GroupsManagementScreen: React.FC = () => {
  const navigation = useNavigation();
  const { selectedGradient } = useBackground();

  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [creating, setCreating] = useState(false);

  const [showAlertDialog, setShowAlertDialog] = useState(false);
  const [alertDialogProps, setAlertDialogProps] = useState<any>({});

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    try {
      setLoading(true);
      const userGroups = await GroupsService.getUserGroups();
      setGroups(userGroups);
    } catch (error) {
      console.error('Error loading groups:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) {
      setAlertDialogProps({
        title: 'خطأ',
        message: 'يرجى إدخال اسم المجموعة',
        type: 'error',
        onConfirm: () => setShowAlertDialog(false),
      });
      setShowAlertDialog(true);
      return;
    }

    setCreating(true);
    try {
      const group = await GroupsService.createGroup(newGroupName.trim());
      if (group) {
        setGroups(prev => [group, ...prev]);
        setShowCreateModal(false);
        setNewGroupName('');
        setAlertDialogProps({
          title: 'تم الإنشاء',
          message: `تم إنشاء مجموعة "${group.name}" بنجاح\nكود الدعوة: ${group.invite_code}`,
          type: 'success',
          onConfirm: () => setShowAlertDialog(false),
        });
        setShowAlertDialog(true);
      }
    } catch (error: any) {
      setAlertDialogProps({
        title: 'خطأ',
        message: error.message || 'حدث خطأ أثناء الإنشاء',
        type: 'error',
        onConfirm: () => setShowAlertDialog(false),
      });
      setShowAlertDialog(true);
    } finally {
      setCreating(false);
    }
  };

  const handleLeaveGroup = (group: Group) => {
    setAlertDialogProps({
      title: 'مغادرة المجموعة',
      message: `هل أنت متأكد من مغادرة "${group.name}"؟`,
      type: 'warning',
      onCancel: () => setShowAlertDialog(false),
      onConfirm: async () => {
        setShowAlertDialog(false);
        try {
          await GroupsService.leaveGroup(group.id);
          setGroups(prev => prev.filter(g => g.id !== group.id));
          setAlertDialogProps({
            title: 'تم',
            message: 'تمت المغادرة بنجاح',
            type: 'success',
            onConfirm: () => setShowAlertDialog(false),
          });
          setShowAlertDialog(true);
        } catch (error: any) {
          setAlertDialogProps({
            title: 'خطأ',
            message: error.message,
            type: 'error',
            onConfirm: () => setShowAlertDialog(false),
          });
          setShowAlertDialog(true);
        }
      },
    });
    setShowAlertDialog(true);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={selectedGradient.colors} style={styles.gradient}>
        <SafeAreaView style={styles.safeArea}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Icon name="arrow-forward" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>إدارة المجموعات</Text>
            <TouchableOpacity onPress={() => setShowCreateModal(true)} style={styles.addButton}>
              <Icon name="add" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <HorizontalLoader color="#ea384c" width={200} />
              </View>
            ) : groups.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Icon name="people-outline" size={60} color="rgba(255,255,255,0.3)" />
                <Text style={styles.emptyText}>لا توجد مجموعات</Text>
                <TouchableOpacity
                  style={styles.createButton}
                  onPress={() => setShowCreateModal(true)}
                >
                  <Text style={styles.createButtonText}>إنشاء مجموعة جديدة</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <Text style={styles.sectionTitle}>مجموعاتك ({groups.length})</Text>
                {groups.map((group) => (
                  <View key={group.id} style={styles.groupCard}>
                    <View style={styles.groupInfo}>
                      <View style={styles.groupIcon}>
                        <Icon name="people" size={24} color="#ea384c" />
                      </View>
                      <View style={styles.groupDetails}>
                        <Text style={styles.groupName}>{group.name}</Text>
                        <Text style={styles.groupRole}>
                          {group.user_role === 'admin' ? '👑 مدير' : '👤 عضو'}
                        </Text>
                        <Text style={styles.groupCode}>كود: {group.invite_code}</Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={styles.leaveButton}
                      onPress={() => handleLeaveGroup(group)}
                    >
                      <Icon name="exit-outline" size={20} color="#ea384c" />
                    </TouchableOpacity>
                  </View>
                ))}
              </>
            )}
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>

      {/* Create Group Modal */}
      <Modal visible={showCreateModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>إنشاء مجموعة جديدة</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="اسم المجموعة"
              placeholderTextColor="rgba(255,255,255,0.4)"
              value={newGroupName}
              onChangeText={setNewGroupName}
              textAlign="right"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowCreateModal(false);
                  setNewGroupName('');
                }}
              >
                <Text style={styles.cancelButtonText}>إلغاء</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleCreateGroup}
                disabled={creating}
              >
                {creating ? (
                  <HorizontalLoader color="#fff" width={60} />
                ) : (
                  <Text style={styles.confirmButtonText}>إنشاء</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <CustomAlertDialog
        visible={showAlertDialog}
        onConfirm={alertDialogProps.onConfirm}
        onCancel={alertDialogProps.onCancel}
        title={alertDialogProps.title}
        message={alertDialogProps.message}
        confirmText={alertDialogProps.confirmText}
        cancelText={alertDialogProps.cancelText}
        type={alertDialogProps.type}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  gradient: { flex: 1 },
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ea384c',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: { flex: 1, padding: 20 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 50 },
  emptyContainer: { alignItems: 'center', marginTop: 50 },
  emptyText: { color: 'rgba(255,255,255,0.5)', fontSize: 16, marginTop: 15, marginBottom: 20 },
  createButton: {
    backgroundColor: '#ea384c',
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 25,
  },
  createButtonText: { color: '#fff', fontWeight: '700' },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 15,
    textAlign: 'right',
  },
  groupCard: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 15,
    borderRadius: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  groupInfo: { flexDirection: 'row-reverse', alignItems: 'center', flex: 1 },
  groupIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(234,56,76,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  groupDetails: { flex: 1, alignItems: 'flex-end' },
  groupName: { color: '#fff', fontSize: 16, fontWeight: '700' },
  groupRole: { color: 'rgba(255,255,255,0.6)', fontSize: 13, marginTop: 2 },
  groupCode: { color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 2 },
  leaveButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(234,56,76,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#2d1b24',
    width: '85%',
    borderRadius: 20,
    padding: 25,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalInput: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 15,
    color: '#fff',
    fontSize: 16,
    marginBottom: 20,
  },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between' },
  modalButton: { flex: 1, padding: 14, borderRadius: 12, alignItems: 'center' },
  cancelButton: { backgroundColor: 'rgba(255,255,255,0.1)', marginRight: 10 },
  confirmButton: { backgroundColor: '#ea384c', marginLeft: 10 },
  cancelButtonText: { color: 'rgba(255,255,255,0.7)', fontWeight: '600' },
  confirmButtonText: { color: '#fff', fontWeight: '700' },
});

export default GroupsManagementScreen;
