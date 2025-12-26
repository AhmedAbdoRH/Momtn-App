import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Switch,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';

const NotificationsScreen: React.FC = () => {
  const navigation = useNavigation();
  
  const [pushEnabled, setPushEnabled] = useState(true);
  const [newPhotos, setNewPhotos] = useState(true);
  const [comments, setComments] = useState(true);
  const [likes, setLikes] = useState(true);
  const [groupInvites, setGroupInvites] = useState(true);
  const [chatMessages, setChatMessages] = useState(true);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={['#14090e', '#4a1e34']} style={styles.gradient}>
        <SafeAreaView style={styles.safeArea}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Icon name="arrow-forward" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>الإشعارات</Text>
            <View style={styles.placeholder} />
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Main Toggle */}
            <View style={styles.mainToggle}>
              <View style={styles.mainToggleInfo}>
                <Icon name="notifications" size={24} color="#ea384c" />
                <Text style={styles.mainToggleTitle}>تفعيل الإشعارات</Text>
              </View>
              <Switch
                value={pushEnabled}
                onValueChange={setPushEnabled}
                trackColor={{ false: 'rgba(255,255,255,0.2)', true: 'rgba(234,56,76,0.5)' }}
                thumbColor={pushEnabled ? '#ea384c' : '#f4f3f4'}
              />
            </View>

            {/* Notification Types */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>أنواع الإشعارات</Text>
              
              <View style={[styles.optionItem, !pushEnabled && styles.optionDisabled]}>
                <View style={styles.optionInfo}>
                  <Icon name="image-outline" size={20} color="rgba(255,255,255,0.7)" />
                  <Text style={styles.optionTitle}>صور جديدة</Text>
                </View>
                <Switch
                  value={newPhotos}
                  onValueChange={setNewPhotos}
                  disabled={!pushEnabled}
                  trackColor={{ false: 'rgba(255,255,255,0.2)', true: 'rgba(234,56,76,0.5)' }}
                  thumbColor={newPhotos && pushEnabled ? '#ea384c' : '#f4f3f4'}
                />
              </View>

              <View style={[styles.optionItem, !pushEnabled && styles.optionDisabled]}>
                <View style={styles.optionInfo}>
                  <Icon name="chatbubble-outline" size={20} color="rgba(255,255,255,0.7)" />
                  <Text style={styles.optionTitle}>التعليقات</Text>
                </View>
                <Switch
                  value={comments}
                  onValueChange={setComments}
                  disabled={!pushEnabled}
                  trackColor={{ false: 'rgba(255,255,255,0.2)', true: 'rgba(234,56,76,0.5)' }}
                  thumbColor={comments && pushEnabled ? '#ea384c' : '#f4f3f4'}
                />
              </View>

              <View style={[styles.optionItem, !pushEnabled && styles.optionDisabled]}>
                <View style={styles.optionInfo}>
                  <Icon name="heart-outline" size={20} color="rgba(255,255,255,0.7)" />
                  <Text style={styles.optionTitle}>الإعجابات</Text>
                </View>
                <Switch
                  value={likes}
                  onValueChange={setLikes}
                  disabled={!pushEnabled}
                  trackColor={{ false: 'rgba(255,255,255,0.2)', true: 'rgba(234,56,76,0.5)' }}
                  thumbColor={likes && pushEnabled ? '#ea384c' : '#f4f3f4'}
                />
              </View>

              <View style={[styles.optionItem, !pushEnabled && styles.optionDisabled]}>
                <View style={styles.optionInfo}>
                  <Icon name="people-outline" size={20} color="rgba(255,255,255,0.7)" />
                  <Text style={styles.optionTitle}>دعوات المجموعات</Text>
                </View>
                <Switch
                  value={groupInvites}
                  onValueChange={setGroupInvites}
                  disabled={!pushEnabled}
                  trackColor={{ false: 'rgba(255,255,255,0.2)', true: 'rgba(234,56,76,0.5)' }}
                  thumbColor={groupInvites && pushEnabled ? '#ea384c' : '#f4f3f4'}
                />
              </View>

              <View style={[styles.optionItem, !pushEnabled && styles.optionDisabled]}>
                <View style={styles.optionInfo}>
                  <Icon name="chatbubbles-outline" size={20} color="rgba(255,255,255,0.7)" />
                  <Text style={styles.optionTitle}>رسائل الدردشة</Text>
                </View>
                <Switch
                  value={chatMessages}
                  onValueChange={setChatMessages}
                  disabled={!pushEnabled}
                  trackColor={{ false: 'rgba(255,255,255,0.2)', true: 'rgba(234,56,76,0.5)' }}
                  thumbColor={chatMessages && pushEnabled ? '#ea384c' : '#f4f3f4'}
                />
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
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
  placeholder: { width: 40 },
  content: { flex: 1, padding: 20 },
  mainToggle: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(234,56,76,0.1)',
    padding: 20,
    borderRadius: 15,
    marginBottom: 25,
    borderWidth: 1,
    borderColor: 'rgba(234,56,76,0.2)',
  },
  mainToggleInfo: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
  },
  mainToggleTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginRight: 12,
  },
  section: { marginBottom: 20 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 15,
    textAlign: 'right',
  },
  optionItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
  },
  optionDisabled: { opacity: 0.5 },
  optionInfo: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
  },
  optionTitle: {
    color: '#fff',
    fontSize: 15,
    marginRight: 12,
  },
});

export default NotificationsScreen;
