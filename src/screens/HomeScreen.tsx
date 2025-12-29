import React, { useState, useEffect, useRef } from 'react';
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Dimensions,
  TextInput,
  ActivityIndicator,
  Share,
  ToastAndroid,
  Platform,
  Modal,
  Animated,
  PanResponder,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CustomAlertDialog from '../components/CustomAlertDialog';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import Clipboard from '@react-native-clipboard/clipboard';
import { useAuth } from '../components/auth/AuthProvider';
import { useNavigation } from '@react-navigation/native';

// Import components from their new locations
import { 
  CreateNewDialog, 
  HeartLogo, 
  PhotoGrid, 
} from '../../components';
import { FloatingChatButton, GroupChatWindow } from '../components/chat';
import NotificationsPopup from '../components/NotificationsPopup';

import { GroupsService, Group } from '../services/groups';
import { useNotifications } from '../hooks/useNotifications';
import { supabase } from '../services/supabase';
import { ProfileService } from '../services/profile';
import { 
  Colors, 
  Spacing, 
  BorderRadius, 
  Shadows, 
  Typography,
  ComponentSizes,
  ZIndex 
} from '../../theme';

import { useRoute, RouteProp } from '@react-navigation/native';

type HomeScreenRouteProp = RouteProp<{
  Main: {
    selectedHashtag?: string | null;
  };
}, 'Main'>;

import notifee, { EventType } from '@notifee/react-native';

const HomeScreen: React.FC = () => {
  const { user, signOut } = useAuth();
  const navigation = useNavigation();
  const route = useRoute<HomeScreenRouteProp>();
  const { unreadCount } = useNotifications(user?.id || null);

  const [activeTab, setActiveTab] = useState<'personal' | 'shared'>('personal');
  const [welcomeMessage, setWelcomeMessage] = useState('لحظاتك السعيدة، والنعم الجميلة في حياتك ✨');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSharedSpacesModal, setShowSharedSpacesModal] = useState(false);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [showJoinGroupModal, setShowJoinGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [joinInviteCode, setJoinInviteCode] = useState('');
  const [userGroups, setUserGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showGroupChat, setShowGroupChat] = useState(false);
  const [photosKey, setPhotosKey] = useState(0);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [showCreatedGroupModal, setShowCreatedGroupModal] = useState(false);
  const [createdGroupInfo, setCreatedGroupInfo] = useState<Group | null>(null);
  const [albums, setAlbums] = useState<{id: string, name: string}[]>([]);
  const [loadingAlbums, setLoadingAlbums] = useState(false);
  
  // Drawer state and animations
  const { width } = Dimensions.get('window');
  const drawerWidth = width * 0.8;
  const drawerAnimation = useRef(new Animated.Value(drawerWidth)).current; // Start at drawerWidth (closed)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Handle drawer open/close
  const toggleDrawer = (open: boolean) => {
    Animated.timing(drawerAnimation, {
      toValue: open ? 0 : drawerWidth,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setIsDrawerOpen(open);
    });
  };

  // PanResponder for dragging from right
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only respond to horizontal swipes from right side or when drawer is open
        const isFromRight = gestureState.moveX > width - 40;
        const isSwipeLeft = gestureState.dx < -10;
        const isSwipeRight = gestureState.dx > 10;
        return (isFromRight && isSwipeLeft) || (isDrawerOpen && isSwipeRight);
      },
      onPanResponderMove: (_, gestureState) => {
        let newValue = gestureState.dx;
        if (!isDrawerOpen) {
          newValue = drawerWidth + gestureState.dx;
        }
        
        // Clamp value between 0 and drawerWidth
        if (newValue < 0) newValue = 0;
        if (newValue > drawerWidth) newValue = drawerWidth;
        
        drawerAnimation.setValue(newValue);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (isDrawerOpen) {
          // If already open, close if swiped right more than 1/4 of drawer width
          if (gestureState.dx > drawerWidth / 4) {
            toggleDrawer(false);
          } else {
            toggleDrawer(true);
          }
        } else {
          // If closed, open if swiped left more than 1/4 of drawer width
          if (gestureState.dx < -drawerWidth / 4) {
            toggleDrawer(true);
          } else {
            toggleDrawer(false);
          }
        }
      },
    })
  ).current;

  const [showAlertDialog, setShowAlertDialog] = useState(false);
  const [alertDialogProps, setAlertDialogProps] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel?: () => void;
    confirmText?: string;
    cancelText?: string;
    type?: 'danger' | 'info';
  }>({
    title: '',
    message: '',
    onConfirm: () => {},
  });

    const handleNotificationData = async (data: any) => {
      if (data?.group_id) {
        console.log('Handling notification for group:', data.group_id);
        
        // تأكد من تحميل المجموعات أولاً إذا لم تكن محملة
        let currentGroups = userGroups;
        if (currentGroups.length === 0) {
          currentGroups = await GroupsService.getUserGroups();
          setUserGroups(currentGroups);
        }
  
        const group = currentGroups.find(g => g.id === data.group_id);
        if (group) {
          setSelectedGroup(group);
          setActiveTab('shared');
          
          // إذا كان إشعار رسالة جديدة، افتح المحادثة فوراً
          if (data.type === 'new_message' || data.type === 'group_chat') {
            setShowGroupChat(true);
          } else {
            // لأنواع الإشعارات الأخرى (صورة، تعليق)، فقط اعرض المجموعة
            setShowGroupChat(false);
          }
        } else {
          console.log('Group not found in user groups:', data.group_id);
        }
      }
    };

  useEffect(() => {
    // التعامل مع الإشعار الذي فتح التطبيق (Cold Start)
    notifee.getInitialNotification().then(initialNotification => {
      if (initialNotification) {
        console.log('App opened from notification:', initialNotification.notification.data);
        handleNotificationData(initialNotification.notification.data);
      }
    });

    // الاستماع للإشعارات أثناء تشغيل التطبيق (Foreground)
    const unsubscribe = notifee.onForegroundEvent(({ type, detail }) => {
      if (type === EventType.PRESS) {
        console.log('User pressed notification in foreground:', detail.notification?.data);
        handleNotificationData(detail.notification?.data);
      }
    });

    return () => unsubscribe();
  }, [userGroups]);

  useEffect(() => {
    loadUserData();
    if (user?.id) {
      loadWelcomeMessage();
      fetchAlbums();
    }
  }, [user, activeTab, selectedGroup]);

  const fetchAlbums = async () => {
    if (!user) return;
    setLoadingAlbums(true);
    try {
      let query = supabase.from('photos').select('hashtags');

      if (activeTab === 'shared' && selectedGroup) {
        query = query.eq('group_id', selectedGroup.id);
      } else {
        query = query.is('group_id', null).eq('user_id', user.id);
      }

      const { data, error } = await query;
      if (error) throw error;

      const tags = new Set<string>();
      data?.forEach((photo: any) => {
        photo.hashtags?.forEach((tag: string) => {
          if (tag?.trim()) tags.add(tag.trim());
        });
      });

      const actualAlbums = Array.from(tags).map((tag, index) => ({
        id: `album-${index}`,
        name: tag
      }));

      setAlbums(actualAlbums);
    } catch (error) {
      console.error('Error fetching albums:', error);
    } finally {
      setLoadingAlbums(false);
    }
  };

  const loadWelcomeMessage = async () => {
    if (!user?.id) return;
    try {
      const profile = await ProfileService.getProfile(user.id);
      if (profile?.user_welcome_message) {
        setWelcomeMessage(profile.user_welcome_message);
      }
    } catch (error) {
      console.error('Error loading welcome message:', error);
    }
  };

  const loadUserData = async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      const groups = await GroupsService.getUserGroups();
      setUserGroups(groups);
    } catch (error) {
      console.error('Error loading groups:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreatePhoto = async (content: string, imageUri?: string, hashtags?: string[]) => {
    try {
      if (!content || content.trim().length < 3) {
        setAlertDialogProps({
          title: 'خطأ',
          message: 'محتوى الصورة يجب أن يكون 3 أحرف على الأقل',
          type: 'danger',
          onConfirm: () => setShowAlertDialog(false),
        });
        setShowAlertDialog(true);
        return;
      }

      setIsLoading(true);
      const photoData = {
        content: content.trim(),
        caption: content.trim(),
        hashtags: hashtags || content.match(/#[ا-ياa-zA-Z0-9_]+/g)?.map(tag => tag.slice(1)) || [],
        image_url: imageUri || null
      };

      if (activeTab === 'shared' && selectedGroup) {
        await GroupsService.addPhotoToGroup(selectedGroup.id, photoData);
        setAlertDialogProps({
          title: 'تم النشر!',
          message: 'تم نشر الصورة في المجموعة بنجاح',
          type: 'info',
          onConfirm: () => setShowAlertDialog(false),
        });
        setShowAlertDialog(true);
      } else {
        await GroupsService.addPersonalPhoto(photoData);
        setAlertDialogProps({
          title: 'تم النشر!',
          message: 'تم نشر الصورة الشخصية بنجاح',
          type: 'info',
          onConfirm: () => setShowAlertDialog(false),
        });
        setShowAlertDialog(true);
      }
      
      // Trigger PhotoGrid refresh
      setPhotosKey(prev => prev + 1);
    } catch (error) {
      console.error('Error creating photo:', error);
      setAlertDialogProps({
        title: 'خطأ',
        message: 'حدث خطأ أثناء إنشاء الصورة',
        type: 'danger',
        onConfirm: () => setShowAlertDialog(false),
      });
      setShowAlertDialog(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    setAlertDialogProps({
      title: 'تسجيل الخروج',
      message: 'هل أنت متأكد من أنك تريد تسجيل الخروج؟',
      type: 'danger',
      onCancel: () => setShowAlertDialog(false),
      onConfirm: async () => {
        setShowAlertDialog(false);
        setShowUserDropdown(false);
        await signOut();
      },
      confirmText: 'تسجيل الخروج',
      cancelText: 'إلغاء'
    });
    setShowAlertDialog(true);
  };

  const handleCreateGroup = async () => {
    console.log('handleCreateGroup called with name:', newGroupName);
    
    if (!newGroupName || newGroupName.trim().length < 2) {
      setAlertDialogProps({
        title: 'خطأ',
        message: 'اسم المجموعة يجب أن يكون حرفين على الأقل',
        type: 'danger',
        onConfirm: () => setShowAlertDialog(false),
      });
      setShowAlertDialog(true);
      return;
    }

    if (!user) {
      setAlertDialogProps({
        title: 'خطأ',
        message: 'يجب تسجيل الدخول أولاً',
        type: 'danger',
        onConfirm: () => setShowAlertDialog(false),
      });
      setShowAlertDialog(true);
      return;
    }

    try {
      setIsLoading(true);
      console.log('Creating group with name:', newGroupName.trim());
      const group = await GroupsService.createGroup(newGroupName.trim());
      console.log('Group created successfully:', group);
      
      if (group) {
        // تحديث قائمة المجموعات
        await loadUserData();
        
        setSelectedGroup(group);
        setActiveTab('shared');
        setShowCreateGroupModal(false);
        setNewGroupName('');
        setCreatedGroupInfo(group);
        setShowCreatedGroupModal(true);
        
        // تحديث مفتاح الصور لإعادة تحميلها
        setPhotosKey(prev => prev + 1);
      } else {
        throw new Error('فشل في إنشاء المجموعة - لم يتم إرجاع بيانات المجموعة');
      }
    } catch (error: any) {
      console.error('Error in handleCreateGroup:', error);
      setAlertDialogProps({
        title: 'خطأ في الإنشاء',
        message: error?.message || 'تعذر إنشاء المجموعة. تأكد من اتصالك بالإنترنت وحاول مرة أخرى',
        type: 'danger',
        onConfirm: () => setShowAlertDialog(false),
      });
      setShowAlertDialog(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasteInviteCode = async () => {
    try {
      const text = await Clipboard.getString();
      if (text) {
        setJoinInviteCode(text.trim());
      }
    } catch (error) {
      console.error('Error pasting from clipboard:', error);
      setAlertDialogProps({
        title: 'تنبيه',
        message: 'يرجى الضغط مطولاً داخل الحقل لاختيار "لصق" (Paste)',
        type: 'info',
        onConfirm: () => setShowAlertDialog(false),
      });
      setShowAlertDialog(true);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      if (!text) return;
      
      console.log('Attempting to copy to clipboard:', text);
      Clipboard.setString(text);
      
      if (Platform.OS === 'android') {
        ToastAndroid.show('تم نسخ الكود بنجاح ✅', ToastAndroid.SHORT);
      } else {
        setAlertDialogProps({
          title: 'تم النسخ!',
          message: 'تم نسخ الكود إلى الحافظة',
          type: 'info',
          onConfirm: () => setShowAlertDialog(false),
        });
        setShowAlertDialog(true);
      }
    } catch (error) {
      console.error('Clipboard error:', error);
      // Fallback to Share
      try {
        await Share.share({
          message: text,
        });
      } catch (shareError) {
        setAlertDialogProps({
          title: 'خطأ',
          message: 'تعذر نسخ الكود',
          type: 'danger',
          onConfirm: () => setShowAlertDialog(false),
        });
        setShowAlertDialog(true);
      }
    }
  };

  const handleJoinGroup = async () => {
    if (!joinInviteCode || joinInviteCode.trim().length < 6) {
      setAlertDialogProps({
        title: 'خطأ',
        message: 'كود الدعوة يجب أن يكون 6 أحرف على الأقل',
        type: 'danger',
        onConfirm: () => setShowAlertDialog(false),
      });
      setShowAlertDialog(true);
      return;
    }

    setIsLoading(true);
    try {
      const group = await GroupsService.joinGroupByInviteCode(joinInviteCode.trim());
      setUserGroups(prev => {
        const exists = prev.find(g => g.id === group.id);
        if (exists) return prev;
        return [...prev, group];
      });
      setSelectedGroup(group);
      setActiveTab('shared');
      setShowJoinGroupModal(false);
      setJoinInviteCode('');
    } catch (error: any) {
      setAlertDialogProps({
        title: 'خطأ',
        message: error.message || 'تعذر الانضمام للمساحة',
        type: 'danger',
        onConfirm: () => setShowAlertDialog(false),
      });
      setShowAlertDialog(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      <LinearGradient 
        colors={[Colors.authGradientStart, Colors.authGradientMiddle, Colors.authGradientEnd]} 
        style={styles.gradient}
      >
        <SafeAreaView style={styles.safeArea}>
          {/* Sidebar Drawer */}
          <Animated.View 
            style={[
              styles.sidebarDrawer,
              { 
                width: drawerWidth,
                transform: [{ translateX: drawerAnimation }] 
              }
            ]}
          >
            <View style={styles.sidebarHeader}>
              <View style={styles.centeredLogo}>
                <HeartLogo size="small" animated={false} />
              </View>
            </View>

            <ScrollView style={styles.sidebarContent}>
              <View style={styles.sidebarUserSection}>
                <View style={styles.sidebarUserInfo}>
                  <Text style={styles.sidebarUserName}>
                    {user?.user_metadata?.full_name || user?.email?.split('@')[0]}
                  </Text>
                  <Text style={styles.sidebarUserEmail}>{user?.email}</Text>
                </View>
              </View>

              <View style={styles.sidebarDivider} />
              
              <View style={styles.sidebarAlbumsSection}>
                <Text style={styles.sidebarSectionTitle}>
                  {activeTab === 'personal' ? 'ألبوماتي الشخصية' : `ألبومات ${selectedGroup?.name || 'المساحة المشتركة'}`}
                </Text>
                
                {loadingAlbums ? (
                  <ActivityIndicator color={Colors.primary} size="small" style={{ marginVertical: 20 }} />
                ) : albums.length > 0 ? (
                  albums.map((album, index) => (
                    <TouchableOpacity 
                      key={album.id} 
                      style={styles.sidebarAlbumItem}
                      onPress={() => {
                        toggleDrawer(false);
                        (navigation.navigate as any)('Main', { selectedHashtag: album.name });
                      }}
                    >
                      <View style={styles.sidebarAlbumIndicator} />
                      <Text style={styles.sidebarAlbumText}>{album.name}</Text>
                      <Icon name="chevron-back" size={14} color="rgba(255,255,255,0.3)" />
                    </TouchableOpacity>
                  ))
                ) : (
                  <Text style={styles.noAlbumsSidebarText}>لا توجد ألبومات حالياً</Text>
                )}
              </View>

              <View style={styles.sidebarDivider} />

              <TouchableOpacity 
                style={styles.sidebarItem}
                onPress={() => {
                  toggleDrawer(false);
                  navigation.navigate('Profile' as never);
                }}
              >
                <Icon name="person-outline" size={22} color="rgba(255,255,255,0.7)" />
                <Text style={styles.sidebarItemText}>إعدادات عامة</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.sidebarLogoutButton}
                onPress={handleLogout}
              >
                <Icon name="exit-outline" size={22} color="#ea384c" />
                <Text style={styles.sidebarLogoutText}>تسجيل الخروج</Text>
              </TouchableOpacity>
            </ScrollView>
          </Animated.View>

          {/* Backdrop when drawer is open */}
          {isDrawerOpen && (
            <TouchableOpacity 
              activeOpacity={1}
              style={styles.drawerBackdrop}
              onPress={() => toggleDrawer(false)}
            />
          )}

          {showNotifications && (
            <TouchableOpacity 
              style={styles.dropdownBackdrop} 
              activeOpacity={1} 
              onPress={() => setShowNotifications(false)}
            >
              <NotificationsPopup
                userId={user?.id || ''}
                onClose={() => setShowNotifications(false)}
                onNotificationPress={(notification) => {
                  handleNotificationData({
                    ...notification.data,
                    group_id: notification.group_id
                  });
                }}
              />
            </TouchableOpacity>
          )}

          {showUserDropdown && (
            <TouchableOpacity 
              style={styles.dropdownBackdrop} 
              activeOpacity={1} 
              onPress={() => setShowUserDropdown(false)}
            >
              <View style={styles.userDropdownOverlay}>
                <TouchableOpacity 
                  style={styles.closeDropdownButton}
                  onPress={() => setShowUserDropdown(false)}
                >
                  <Icon name="close" size={20} color="rgba(255,255,255,0.5)" />
                </TouchableOpacity>
                <View style={styles.userDropdownContent}>
                  <Text style={styles.userDropdownName}>{user?.user_metadata?.full_name || user?.email?.split('@')[0]}</Text>
                  <Text style={styles.userDropdownEmail}>{user?.email}</Text>
                  
                  
                  <TouchableOpacity 
                    style={styles.logoutButton}
                    onPress={handleLogout}
                  >
                    <View style={styles.logoutButtonContent}>
                      <Icon name="exit-outline" size={18} color="#FFFFFF" />
                      <Text style={styles.logoutButtonText}>تسجيل الخروج</Text>
                    </View>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          )}

          <ScrollView 
            style={styles.mainScrollView}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.topBar}>
              <TouchableOpacity 
                style={styles.topButton} 
                onPress={() => setShowUserDropdown(!showUserDropdown)}
              >
                <Icon name="person-circle-outline" size={22} color="#FFFFFF" />
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.topButton, { marginLeft: 10 }]} 
                onPress={() => setShowNotifications(!showNotifications)}
              >
                <Icon name="notifications-outline" size={22} color="#FFFFFF" />
                {unreadCount > 0 && (
                  <View style={styles.notificationBadge}>
                    <Text style={styles.notificationBadgeText}>
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
              
              <View style={styles.spacer} />
              
              <TouchableOpacity 
                style={styles.topButton} 
                onPress={() => toggleDrawer(true)}
              >
                <Icon name="menu-outline" size={26} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <HeartLogo />

            <View style={styles.headerTitleContainer}>
              <Text style={styles.greetingText}>
                {activeTab === 'personal'
                  ? (user?.user_metadata?.greeting_message || welcomeMessage)
                  : selectedGroup
                    ? `💫 مساحة "${selectedGroup.name}" المشتركة`
                    : '👥 المساحات المشتركة'
                }
              </Text>
              {activeTab === 'shared' && selectedGroup && (
                <TouchableOpacity 
                  style={styles.infoButton}
                  onPress={() => setShowGroupInfo(true)}
                >
                  <Icon name="information-circle-outline" size={24} color="#FFFFFF" />
                </TouchableOpacity>
              )}
            </View>

            {activeTab === 'shared' && !selectedGroup && (
              <View style={styles.noGroupSelectedContainer}>
                <Icon name="people-outline" size={60} color="rgba(255,255,255,0.3)" />
                <Text style={styles.noGroupSelectedText}>اختر مساحة مشتركة للبدء في مشاركة اللحظات</Text>
                <TouchableOpacity 
                  style={styles.selectGroupButton}
                  onPress={() => setShowSharedSpacesModal(true)}
                >
                  <Text style={styles.selectGroupButtonText}>عرض المساحات</Text>
                </TouchableOpacity>
              </View>
            )}

            {(activeTab === 'personal' || (activeTab === 'shared' && selectedGroup)) && (
              <TouchableOpacity 
                style={styles.addButton} 
                onPress={() => setShowCreateDialog(true)}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={['#ea384c', '#d94550', '#c73e48']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.addButtonGradient}
                >
                  <View style={styles.addButtonContent}>
                    <Text style={styles.addButtonText}>إضافة امتنان جديد</Text>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            )}

            {(activeTab === 'personal' || (activeTab === 'shared' && selectedGroup)) && (
              <PhotoGrid 
                key={`${activeTab}-${selectedGroup?.id || 'personal'}-${photosKey}-${route.params?.selectedHashtag || 'none'}`}
                currentUserId={user?.id || ''}
                currentUser={user ? {
                  id: user.id,
                  email: user.email,
                  full_name: user.user_metadata?.full_name
                } : undefined}
                selectedGroupId={activeTab === 'shared' ? selectedGroup?.id || null : null}
                onPhotoAdded={() => setPhotosKey(prev => prev + 1)}
                embedded={true}
                navigation={navigation as any}
                initialHashtag={route.params?.selectedHashtag}
              />
            )}
          </ScrollView>

          <View style={styles.bottomNavContainer}>
            <TouchableOpacity 
              style={[styles.navItem, activeTab === 'personal' && styles.navItemActive]}
              onPress={() => setActiveTab('personal')}
            >
              <Icon name="person-outline" size={24} color={activeTab === 'personal' ? '#FFFFFF' : 'rgba(255,255,255,0.5)'} />
              <Text style={[styles.navText, activeTab === 'personal' && styles.navTextActive]}>المساحة الشخصية</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.navItem, activeTab === 'shared' && styles.navItemActive]}
              onPress={() => setShowSharedSpacesModal(true)}
            >
              <Icon name="people-outline" size={24} color={activeTab === 'shared' ? '#FFFFFF' : 'rgba(255,255,255,0.5)'} />
              <Text style={[styles.navText, activeTab === 'shared' && styles.navTextActive]}>المساحات المشتركة</Text>
            </TouchableOpacity>
          </View>

          {/* Floating Chat Button - يظهر فقط في المساحات المشتركة */}
          {activeTab === 'shared' && selectedGroup && (
            <FloatingChatButton onPress={() => setShowGroupChat(true)} />
          )}

          {/* Floating Add Button (FAB) - يظهر دائماً في أسفل اليسار */}
          {(activeTab === 'personal' || (activeTab === 'shared' && selectedGroup)) && (
            <TouchableOpacity 
              style={styles.fabButton} 
              onPress={() => setShowCreateDialog(true)}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#ea384c', '#d94550', '#c73e48']}
                style={styles.fabGradient}
              >
                <Icon name="add" size={30} color="#FFFFFF" />
              </LinearGradient>
            </TouchableOpacity>
          )}
        </SafeAreaView>
      </LinearGradient>

      <CreateNewDialog
        visible={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onSubmit={handleCreatePhoto}
      />

      {/* Group Chat Window */}
      {selectedGroup && (
        <GroupChatWindow
          visible={showGroupChat}
          onClose={() => setShowGroupChat(false)}
          groupId={selectedGroup.id}
          groupName={selectedGroup.name}
          currentUserId={user?.id || ''}
        />
      )}

      <Modal
        visible={showSharedSpacesModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowSharedSpacesModal(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={StyleSheet.absoluteFill} 
            activeOpacity={1} 
            onPress={() => setShowSharedSpacesModal(false)}
          />
          <View style={styles.sharedSpacesModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>المساحات المشتركة</Text>
              <TouchableOpacity onPress={() => setShowSharedSpacesModal(false)} style={styles.closeButton}>
                <Icon name="close" size={26} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            
            <ScrollView 
              style={styles.modalScrollView}
              contentContainerStyle={styles.modalScrollViewContent}
              showsVerticalScrollIndicator={false}
            >
              {isLoading ? (
                <View style={styles.emptyGroupsContainer}>
                  <ActivityIndicator size="large" color="#ea384c" />
                  <Text style={[styles.noGroupsText, { marginTop: 10 }]}>جاري تحميل المساحات...</Text>
                </View>
              ) : userGroups.length === 0 ? (
                <View style={styles.emptyGroupsContainer}>
                  <Icon name="people-outline" size={50} color="rgba(255,255,255,0.2)" />
                  <Text style={styles.noGroupsText}>لا توجد مساحات مشتركة حالياً</Text>
                </View>
              ) : (
                userGroups.map((group) => (
                  <TouchableOpacity
                    key={group.id}
                    style={[styles.groupItem, selectedGroup?.id === group.id && styles.selectedGroupItem]}
                    onPress={() => {
                      setSelectedGroup(group);
                      setActiveTab('shared');
                      setShowSharedSpacesModal(false);
                    }}
                  >
                    <View style={styles.groupItemLeft}>
                      <View style={styles.groupIconCircle}>
                        <Icon name="people" size={20} color="#FFFFFF" />
                      </View>
                      <View style={styles.groupItemTextContainer}>
                        <Text style={styles.groupItemName}>{group.name}</Text>
                        <View style={styles.memberBadge}>
                          <Text style={styles.memberBadgeText}>عضو</Text>
                        </View>
                      </View>
                    </View>
                    <View style={styles.groupItemRight}>
                      <Icon name="chevron-back" size={20} color="rgba(255,255,255,0.3)" />
                    </View>
                  </TouchableOpacity>
                ))
              )}
              
              <View style={styles.modalDivider} />
              
              <TouchableOpacity 
                style={[styles.actionButton, styles.createButton]} 
                onPress={() => {
                  console.log('Create group button pressed');
                  setShowSharedSpacesModal(false);
                  setTimeout(() => {
                    setShowCreateGroupModal(true);
                  }, 300);
                }}
                activeOpacity={0.7}
              >
                <View style={styles.buttonContent}>
                  <Text style={styles.buttonText}>إنشاء مساحة جديدة</Text>
                  <Icon name="add-circle-outline" size={22} color="#66bb6a" style={styles.buttonIcon} />
                </View>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.actionButton, styles.joinButton]} 
                onPress={() => {
                  console.log('Join group button pressed');
                  setShowSharedSpacesModal(false);
                  setTimeout(() => {
                    setShowJoinGroupModal(true);
                  }, 300);
                }}
                activeOpacity={0.7}
              >
                <View style={styles.buttonContent}>
                  <Text style={styles.buttonText}>الانضمام لمساحة</Text>
                  <Icon name="enter-outline" size={22} color="#42a5f5" style={styles.buttonIcon} />
                </View>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showGroupInfo && selectedGroup !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowGroupInfo(false)}
      >
        <View style={styles.modalOverlayCenter}>
          <View style={styles.centeredModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>معلومات المساحة</Text>
              <TouchableOpacity onPress={() => setShowGroupInfo(false)}>
                <Icon name="close-circle-outline" size={26} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>اسم المساحة:</Text>
              <Text style={styles.infoValue}>{selectedGroup?.name}</Text>
              
              <Text style={styles.infoLabel}>كود الدعوة:</Text>
              <View style={[styles.inviteCodeContainer, styles.inviteCodeRow]}>
                <TextInput
                  style={[styles.inviteCodeText, styles.inviteCodeField]}
                  value={selectedGroup?.invite_code ?? ''}
                  editable={false}
                  selectTextOnFocus={true}
                />
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="نسخ كود الدعوة"
                  style={styles.copyIconButton}
                  onPress={() => copyToClipboard(selectedGroup?.invite_code ?? '')}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Icon name="copy-outline" size={20} color="#FFFFFF" />
                  <Text style={styles.copyIconButtonText}>نسخ</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.infoHint}>شارك هذا الكود مع أصدقائك لينضموا إليك</Text>
              
              <TouchableOpacity 
                style={[styles.actionButton, { backgroundColor: '#ea384c', marginTop: 20 }]}
                onPress={() => setShowGroupInfo(false)}
              >
                <Text style={styles.buttonText}>إغلاق</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showCreateGroupModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => { setShowCreateGroupModal(false); setNewGroupName(''); }}
      >
        <View style={styles.modalOverlayCenter}>
          <View style={styles.centeredModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>إنشاء مساحة جديدة</Text>
              <TouchableOpacity onPress={() => { setShowCreateGroupModal(false); setNewGroupName(''); }}>
                <Icon name="close-circle-outline" size={26} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.modalInput}
                placeholder="أدخل اسم المساحة"
                placeholderTextColor="rgba(255,255,255,0.4)"
                value={newGroupName}
                onChangeText={setNewGroupName}
                autoFocus
                textAlign="right"
              />
              <TouchableOpacity 
                style={[styles.actionButton, styles.createButton, { marginTop: 20 }]} 
                onPress={handleCreateGroup}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.buttonText}>إنشاء</Text>
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

      <Modal
        visible={showJoinGroupModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => { setShowJoinGroupModal(false); setJoinInviteCode(''); }}
      >
        <View style={styles.modalOverlayCenter}>
          <View style={styles.centeredModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>الانضمام لمساحة</Text>
              <TouchableOpacity onPress={() => { setShowJoinGroupModal(false); setJoinInviteCode(''); }}>
                <Icon name="close-circle-outline" size={26} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            <View style={styles.inputContainer}>
              <View style={styles.inputWithAction}>
                <TextInput
                  style={[styles.modalInput, { flex: 1, marginBottom: 0 }]}
                  placeholder="أدخل كود الدعوة"
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  value={joinInviteCode}
                  onChangeText={(text) => {
                    console.log('Input changed:', text);
                    setJoinInviteCode(text);
                  }}
                  autoFocus
                  maxLength={20}
                  textAlign="center"
                  keyboardType="default"
                  autoCapitalize="none"
                />
                <TouchableOpacity 
                  style={styles.inputActionButton}
                  onPress={handlePasteInviteCode}
                >
                  <Icon name="clipboard-outline" size={24} color="#FFFFFF" />
                  <Text style={styles.inputActionText}>لصق</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity 
                style={[styles.actionButton, styles.joinButton, { marginTop: 20 }]} 
                onPress={handleJoinGroup}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.buttonText}>انضمام</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showCreatedGroupModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowCreatedGroupModal(false)}
      >
        <View style={styles.modalOverlayCenter}>
          <View style={styles.centeredModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>تم إنشاء المساحة بنجاح! 🎉</Text>
              <TouchableOpacity onPress={() => setShowCreatedGroupModal(false)}>
                <Icon name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.infoContent}>
              <View style={{ alignItems: 'center', marginBottom: 20 }}>
                <Icon name="checkmark-circle" size={80} color="#66bb6a" />
              </View>

              <Text style={styles.infoLabel}>اسم المساحة:</Text>
              <Text style={styles.infoValue}>{createdGroupInfo?.name}</Text>
              
              <Text style={styles.infoLabel}>كود الدعوة:</Text>
              <View style={styles.inviteCodeContainer}>
                <Text style={styles.inviteCodeText}>
                  {createdGroupInfo?.invite_code}
                </Text>
                
                <TouchableOpacity 
                  style={styles.copyButton}
                  onPress={() => copyToClipboard(createdGroupInfo?.invite_code ?? '')}
                >
                  <Icon name="copy-outline" size={20} color="white" style={{ marginRight: 8 }} />
                  <Text style={styles.copyButtonText}>نسخ كود الدعوة</Text>
                </TouchableOpacity>
              </View>
              
              <Text style={[styles.infoHint, { color: 'rgba(255,255,255,0.6)', textAlign: 'center', fontSize: 14, lineHeight: 20 }]}>
                شارك هذا الكود مع أصدقائك لينضموا إليك في هذه المساحة المشتركة
              </Text>
              
              <TouchableOpacity 
                style={[styles.actionButton, { backgroundColor: 'rgba(255,255,255,0.1)', marginTop: 25, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' }]}
                onPress={() => setShowCreatedGroupModal(false)}
              >
                <Text style={styles.buttonText}>إغلاق</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  mainScrollView: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.xl,
    paddingTop: 50,
    alignItems: 'center',
  },
  topButton: {
    width: ComponentSizes.buttonIconSize,
    height: ComponentSizes.buttonIconSize,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.glassLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#ea384c',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: Colors.authGradientStart,
  },
  notificationBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  spacer: {
    flex: 1,
  },
  greetingText: {
    color: Colors.textPrimary,
    fontSize: Typography.body.fontSize,
    textAlign: 'center',
    marginVertical: Spacing.xl,
    paddingHorizontal: Spacing.xl,
    flex: 1,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    width: '100%',
  },
  infoButton: {
    padding: 5,
  },
  noGroupsText: {
    color: Colors.textMuted,
    textAlign: 'center',
    marginVertical: Spacing.xl,
    fontSize: Typography.body.fontSize,
  },
  groupItemRole: {
    color: Colors.textMuted,
    fontSize: Typography.caption.fontSize,
    marginTop: 2,
  },
  noGroupSelectedContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.huge,
    marginTop: Spacing.xl,
  },
  noGroupSelectedText: {
    color: Colors.textSecondary,
    fontSize: Typography.body.fontSize,
    textAlign: 'center',
    marginVertical: Spacing.xl,
  },
  selectGroupButton: {
    backgroundColor: Colors.glassLight,
    paddingHorizontal: Spacing.xxxl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  selectGroupButtonText: {
    color: Colors.textPrimary,
    fontSize: Typography.body.fontSize,
    fontWeight: '700',
  },
  inputContainer: {
    width: '100%',
  },
  modalInput: {
    backgroundColor: Colors.glassLight,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    color: Colors.textPrimary,
    fontSize: Typography.body.fontSize,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  inputWithAction: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputActionButton: {
    backgroundColor: Colors.glassLight,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
    height: ComponentSizes.inputHeight,
    minWidth: 60,
    marginLeft: Spacing.sm,
  },
  inputActionText: {
    color: Colors.textPrimary,
    fontSize: Typography.tiny.fontSize,
    marginTop: 2,
  },
  inviteCodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  inviteCodeField: {
    flex: 1,
    textAlign: 'center',
    marginRight: 0,
  },
  copyIconButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    marginLeft: Spacing.md,
  },
  copyIconButtonText: {
    color: Colors.textPrimary,
    fontWeight: '700',
    marginLeft: Spacing.sm,
  },
  infoContent: {
    padding: Spacing.xl,
    alignItems: 'center',
  },
  infoLabel: {
    color: Colors.textMuted,
    fontSize: Typography.bodySmall.fontSize,
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  infoValue: {
    color: Colors.textPrimary,
    fontSize: Typography.h3.fontSize,
    fontWeight: '700',
    marginBottom: Spacing.xl,
    textAlign: 'center',
  },
  inviteCodeContainer: {
    backgroundColor: Colors.glassLight,
    borderRadius: BorderRadius.lg,
    padding: 20,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: Colors.primary,
    marginBottom: Spacing.sm,
  },
  inviteCodeText: {
    color: Colors.primary,
    fontSize: 42,
    fontWeight: '700',
    marginBottom: 15,
    letterSpacing: 2,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ea384c',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    elevation: 4,
    shadowColor: '#ea384c',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  copyButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  // Sidebar Styles
  sidebarDrawer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#1a1a1a',
    zIndex: ZIndex.modal + 10,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255, 255, 255, 0.1)',
    ...Shadows.xl,
    elevation: 20,
  },
  sidebarHeader: {
    paddingTop: 30,
    paddingBottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centeredLogo: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  sidebarContent: {
    flex: 1,
  },
  sidebarUserSection: {
    alignItems: 'center',
    padding: 20,
    marginBottom: 10,
  },
  sidebarUserInfo: {
    alignItems: 'center',
  },
  sidebarSectionTitle: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 14,
    fontWeight: 'bold',
    paddingHorizontal: 20,
    marginBottom: 15,
    textAlign: 'right',
  },
  sidebarAlbumsSection: {
    marginBottom: 10,
  },
  sidebarAlbumItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
  },
  sidebarAlbumIndicator: {
    width: 4,
    height: 20,
    backgroundColor: '#ea384c',
    borderRadius: 2,
    marginLeft: 15,
  },
  sidebarAlbumText: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    textAlign: 'right',
  },
  noAlbumsSidebarText: {
    color: 'rgba(255, 255, 255, 0.3)',
    fontSize: 14,
    textAlign: 'center',
    marginVertical: 20,
  },
  sidebarUserName: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  sidebarUserEmail: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 14,
  },
  sidebarDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginVertical: 15,
    marginHorizontal: 20,
  },
  sidebarItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  sidebarItemText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 16,
    marginRight: 15,
  },
  sidebarLogoutButton: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginTop: 10,
    marginBottom: 40,
  },
  sidebarLogoutText: {
    color: '#ea384c',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 15,
  },
  drawerBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: ZIndex.modal + 9,
    elevation: 19,
  },
  infoHint: {
    color: Colors.textMuted,
    fontSize: Typography.caption.fontSize,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  addButton: {
    marginHorizontal: Spacing.xxl,
    marginBottom: Spacing.xl,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
    ...Shadows.lg,
    shadowColor: Colors.primary,
    shadowOpacity: 0.4,
  },
  addButtonGradient: {
    paddingVertical: Spacing.md + 2,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.full,
  },
  addButtonContent: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  addButtonText: {
    color: Colors.textPrimary,
    fontSize: Typography.body.fontSize,
    fontWeight: '700',
    marginRight: Spacing.sm,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  userDropdownOverlay: {
    position: 'absolute',
    top: 60,
    left: Spacing.xl,
    zIndex: ZIndex.dropdown,
    backgroundColor: 'rgba(20, 9, 14, 0.95)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    width: 240,
    maxHeight: 400,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    ...Shadows.xl,
  },
  closeDropdownButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    padding: 5,
    zIndex: 10,
  },
  dropdownBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: ZIndex.dropdown - 1,
  },
  albumSeparator: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginVertical: Spacing.md,
  },
  albumSectionTitle: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: Spacing.sm,
    textAlign: 'right',
  },
  albumsDropdownList: {
    maxHeight: 200,
  },
  albumBar: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginBottom: Spacing.xs,
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderLeftWidth: 3,
  },
  albumBarIndicator: {
    width: 4,
    height: '100%',
    borderRadius: 2,
    marginLeft: Spacing.sm,
  },
  albumBarText: {
    color: '#FFFFFF',
    fontSize: 14,
    flex: 1,
    textAlign: 'right',
  },
  noAlbumsText: {
    color: 'rgba(255, 255, 255, 0.3)',
    fontSize: 12,
    textAlign: 'center',
    marginVertical: Spacing.md,
  },
  userDropdownContent: {
    width: '100%',
    paddingTop: Spacing.sm,
  },
  userDropdownName: {
    color: Colors.textPrimary,
    fontWeight: '700',
    fontSize: Typography.body.fontSize,
    marginBottom: Spacing.xs,
  },
  userDropdownEmail: {
    color: Colors.textSecondary,
    fontSize: Typography.caption.fontSize,
    marginBottom: Spacing.xl,
  },
  logoutButton: {
    backgroundColor: Colors.error,
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  logoutButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutButtonText: {
    color: Colors.textPrimary,
    marginLeft: Spacing.sm,
    fontSize: Typography.bodySmall.fontSize,
  },
  bottomNavContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.glassDark,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLighter,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navItemActive: {
    // optional styling for active tab
  },
  navText: {
    color: Colors.textMuted,
    fontSize: Typography.caption.fontSize,
    marginTop: Spacing.xs,
  },
  navTextActive: {
    color: Colors.textPrimary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
    paddingBottom: 20, // إضافة فراغ سفلي
  },
  modalOverlayCenter: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  sharedSpacesModal: {
    backgroundColor: '#1a1a1a', // Dark background
    borderRadius: 25, // حواف دائرية من جميع الجهات
    padding: 16,
    width: '94%', // تصغير العرض قليلاً ليتناسب مع الفراغ
    alignSelf: 'center', // توسيط النافذة
    maxHeight: '80%',
    minHeight: 300,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalScrollView: {
    width: '100%',
  },
  modalScrollViewContent: {
    paddingBottom: 20,
  },
  emptyGroupsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
  },
  closeButton: {
    padding: 4,
  },
  modalDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginVertical: 12,
    width: '100%',
  },
  buttonContent: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centeredModalContent: {
    backgroundColor: 'rgba(20, 9, 14, 0.95)',
    borderRadius: 25,
    padding: 16,
    width: '100%',
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalHeader: {
    flexDirection: 'row-reverse', 
    justifyContent: 'space-between',
    alignItems: 'center', 
    marginBottom: 12,
    paddingHorizontal: 8,
  }, 
  modalTitle: {
    color: '#FFFFFF', 
    fontSize: 18,
    fontWeight: 'bold', 
  },
  groupItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginBottom: 8,
  },
  groupItemLeft: {
    flexDirection: 'row-reverse', 
    alignItems: 'center',
    flex: 1,
  },
  selectedGroupItem: {
    backgroundColor: 'rgba(234, 56, 76, 0.2)',
    borderColor: '#ea384c', 
    borderWidth: 1,
  },
  groupIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ea384c', 
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  groupItemTextContainer: {
    marginRight: 0, 
    alignItems: 'flex-end',
  },
  groupItemName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  memberBadge: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 1,
    borderRadius: 10,
  },
  memberBadgeText: {
    color: '#000000',
    fontSize: 10,
    fontWeight: 'bold',
  },
  groupItemRight: {
    paddingRight: 5,
  },
  actionButton: {
    padding: 12,
    borderRadius: 12,
    marginTop: 8,
    alignItems: 'center',
    ...Shadows.md,
  },
  buttonIcon: {
    marginLeft: 10,
  },
  createButton: {
    backgroundColor: 'rgba(102, 187, 106, 0.1)', // لون أخضر شفاف
    borderWidth: 1,
    borderColor: '#66bb6a',
  },
  joinButton: {
    backgroundColor: 'rgba(66, 165, 245, 0.1)', // لون أزرق شفاف
    borderWidth: 1,
    borderColor: '#42a5f5',
    marginBottom: 60,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  fabButton: {
    position: 'absolute',
    bottom: 100, // تم رفعه قليلاً من 90 إلى 100
    left: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    zIndex: ZIndex.overlay,
  },
  fabGradient: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.75, // شفافية الزر
  },
});

export default HomeScreen;
