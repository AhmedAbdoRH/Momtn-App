import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import { ComponentSizes, Spacing } from '../theme';

interface HeartLogoProps {
  size?: 'small' | 'medium' | 'large';
  animated?: boolean;
}

// Custom logo component with float animation
const HeartLogo: React.FC<HeartLogoProps> = ({ 
  size = 'medium', 
  animated = true 
}) => {
  const floatAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!animated) return;

    // Float animation - translateY from 0 to -10px
    const floatAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -10,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    // Pulse animation - subtle scale effect
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 3000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 3000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    floatAnimation.start();
    pulseAnimation.start();

    return () => {
      floatAnimation.stop();
      pulseAnimation.stop();
    };
  }, [animated, floatAnim, pulseAnim]);

  const getLogoSize = () => {
    switch (size) {
      case 'small':
        return ComponentSizes.logoSmall;
      case 'large':
        return ComponentSizes.logoLarge;
      default:
        return ComponentSizes.logoMedium;
    }
  };

  const logoSize = getLogoSize();

  return (
    <View style={styles.container}>
      {/* Main logo with float animation */}
      <Animated.Image 
        source={require('../assets/Logo.png')} 
        style={[
          styles.customLogo,
          {
            width: logoSize,
            height: logoSize,
            transform: [
              { translateY: floatAnim },
              { scale: pulseAnim },
            ],
          },
        ]}
        resizeMode="contain"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: Spacing.xl,
    position: 'relative',
  },
  customLogo: {
    zIndex: 2,
  },
});

export default HeartLogo;