import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {Colors, Typography, Spacing} from '../theme';

interface GreetingProps {
  name: string;
}

const Greeting: React.FC<GreetingProps> = ({name}) => {
  return (
    <View style={styles.greetingContainer}>
      <Text style={styles.greetingText}>Hello {name}!</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  greetingContainer: {
    padding: Spacing.lg,
  },
  greetingText: {
    ...Typography.h2,
    textAlign: 'center',
    color: Colors.primary,
  },
});

export default Greeting;
