import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

interface HorizontalLoaderProps {
  color?: string;
  width?: number | string;
  height?: number;
  duration?: number;
}

const HorizontalLoader: React.FC<HorizontalLoaderProps> = ({
  color = '#ea384c',
  width = 300,
  height = 3,
  duration = 1500,
}) => {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const startAnimation = () => {
      animatedValue.setValue(0);
      Animated.loop(
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: duration,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();
    };

    startAnimation();
  }, [animatedValue, duration]);

  const translateX = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [-150, 300], // Adjust based on width if needed
  });

  return (
    <View style={[styles.track, { width, height }]}>
      <Animated.View
        style={[
          styles.bar,
          {
            width: 150,
            transform: [{ translateX }],
          },
        ]}
      >
        <LinearGradient
          colors={['transparent', color, 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradient}
        />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  track: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 1,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'center',
  },
  bar: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: '100%',
  },
  gradient: {
    flex: 1,
  },
});

export default HorizontalLoader;
