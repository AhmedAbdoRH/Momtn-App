import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Animated,
  Easing,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import { 
  Colors, 
  Spacing, 
  BorderRadius, 
  ComponentSizes,
  ZIndex,
} from '../theme';

interface BottomNavigationBarProps {
  activeTab: 'personal' | 'shared';
  onTabChange: (tab: 'personal' | 'shared') => void;
}

const BottomNavigationBar: React.FC<BottomNavigationBarProps> = ({
  activeTab,
  onTabChange,
}) => {
  const personalScale = useRef(new Animated.Value(activeTab === 'personal' ? 1 : 0.9)).current;
  const sharedScale = useRef(new Animated.Value(activeTab === 'shared' ? 1 : 0.9)).current;
  const indicatorPosition = useRef(new Animated.Value(activeTab === 'personal' ? 0 : 1)).current;

  useEffect(() => {
    // Animate tab change
    Animated.parallel([
      Animated.spring(personalScale, {
        toValue: activeTab === 'personal' ? 1 : 0.9,
        friction: 6,
        useNativeDriver: true,
      }),
      Animated.spring(sharedScale, {
        toValue: activeTab === 'shared' ? 1 : 0.9,
        friction: 6,
        useNativeDriver: true,
      }),
      Animated.timing(indicatorPosition, {
        toValue: activeTab === 'personal' ? 0 : 1,
        duration: 250,
        easing: Easing.out(Easing.ease),
        useNativeDriver: false,
      }),
    ]).start();
  }, [activeTab, indicatorPosition, personalScale, sharedScale]);

  const handleTabPress = (tab: 'personal' | 'shared') => {
    if (tab !== activeTab) {
      onTabChange(tab);
    }
  };

  return (
    <View style={styles.container}>
      {/* Glass background with gradient */}
      <LinearGradient
        colors={['rgba(20, 9, 14, 0.95)', 'rgba(45, 27, 36, 0.98)']}
        style={styles.gradientBackground}
      />
      
      {/* Top border glow */}
      <View style={styles.topBorderGlow} />
      
      {/* Navigation content */}
      <View style={styles.navigationContent}>
        {/* Personal Space Tab */}
        <TouchableOpacity
          style={styles.tab}
          onPress={() => handleTabPress('personal')}
          activeOpacity={0.7}
        >
          <Animated.View style={[
            styles.tabContent,
            { transform: [{ scale: personalScale }] },
            activeTab === 'personal' && styles.activeTabContent,
          ]}>
            <View style={[
              styles.tabIconContainer,
              activeTab === 'personal' && styles.activeTabIconContainer,
            ]}>
              <Icon
                name={activeTab === 'personal' ? 'person' : 'person-outline'}
                size={22}
                color={activeTab === 'personal' ? Colors.textPrimary : Colors.textMuted}
              />
            </View>
            <Text style={[
              styles.tabLabel,
              activeTab === 'personal' && styles.activeTabLabel,
            ]}>
              مساحتي
            </Text>
            {activeTab === 'personal' && <View style={styles.activeIndicator} />}
          </Animated.View>
        </TouchableOpacity>

        {/* Center Divider with glow */}
        <View style={styles.dividerContainer}>
          <View style={styles.dividerGlow} />
          <View style={styles.divider} />
        </View>

        {/* Shared Spaces Tab */}
        <TouchableOpacity
          style={styles.tab}
          onPress={() => handleTabPress('shared')}
          activeOpacity={0.7}
        >
          <Animated.View style={[
            styles.tabContent,
            { transform: [{ scale: sharedScale }] },
            activeTab === 'shared' && styles.activeTabContent,
          ]}>
            <View style={[
              styles.tabIconContainer,
              activeTab === 'shared' && styles.activeTabIconContainer,
            ]}>
              <MaterialIcon
                name={activeTab === 'shared' ? 'group' : 'group-outlined'}
                size={22}
                color={activeTab === 'shared' ? Colors.textPrimary : Colors.textMuted}
              />
            </View>
            <Text style={[
              styles.tabLabel,
              activeTab === 'shared' && styles.activeTabLabel,
            ]}>
              مساحات مشتركة
            </Text>
            {activeTab === 'shared' && <View style={styles.activeIndicator} />}
          </Animated.View>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: Platform.OS === 'ios' ? ComponentSizes.bottomNavHeightIOS : ComponentSizes.bottomNavHeight,
    zIndex: ZIndex.bottomNav,
  },
  gradientBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  topBorderGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(234, 56, 76, 0.3)',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  navigationContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  activeTabContent: {
    backgroundColor: 'rgba(234, 56, 76, 0.15)',
  },
  tabIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  activeTabIconContainer: {
    backgroundColor: 'rgba(234, 56, 76, 0.25)',
    borderWidth: 1,
    borderColor: 'rgba(234, 56, 76, 0.4)',
  },
  tabLabel: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: '500',
    textAlign: 'center',
  },
  activeTabLabel: {
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: -2,
    width: 20,
    height: 3,
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
  dividerContainer: {
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: Spacing.xs,
  },
  dividerGlow: {
    position: 'absolute',
    width: 1,
    height: 30,
    backgroundColor: 'rgba(234, 56, 76, 0.2)',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
  },
  divider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
});

export default BottomNavigationBar;
