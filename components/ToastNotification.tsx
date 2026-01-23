import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, Animated, TouchableOpacity } from 'react-native';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '../theme';
import Icon from 'react-native-vector-icons/Ionicons';

interface ToastNotificationProps {
    visible: boolean;
    message: string;
    type?: 'info' | 'success' | 'error' | 'warning';
    onDismiss?: () => void;
    onPress?: () => void;
    duration?: number;
    showIcon?: boolean;
}

const { width } = Dimensions.get('window');

const ToastNotification: React.FC<ToastNotificationProps> = ({
    visible,
    message,
    type = 'info',
    onDismiss,
    onPress,
    duration = 4000,
    showIcon = true,
}) => {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(-100)).current; // Start from top
    const progressAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            // Reset progress
            progressAnim.setValue(0);
            
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 400,
                    useNativeDriver: true,
                }),
                Animated.spring(slideAnim, {
                    toValue: 0,
                    friction: 8,
                    tension: 40,
                    useNativeDriver: true,
                }),
                Animated.timing(progressAnim, {
                    toValue: 1,
                    duration: duration,
                    useNativeDriver: false, // Progress bar width can't use native driver
                }),
            ]).start();

            const timer = setTimeout(() => {
                handleDismiss();
            }, duration);

            return () => clearTimeout(timer);
        } else {
            handleDismiss();
        }
    }, [visible, message, type]);

    const handleDismiss = () => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: -100,
                duration: 300,
                useNativeDriver: true,
            }),
        ]).start(() => {
            if (onDismiss) onDismiss();
        });
    };

    if (!visible && fadeAnim._value === 0) return null;

    const getIconName = () => {
        switch (type) {
            case 'success':
                return 'checkmark-circle-outline';
            case 'error':
                return 'alert-circle-outline';
            case 'warning':
                return 'warning-outline';
            default:
                return 'information-circle-outline';
        }
    };

    const getColors = () => {
        switch (type) {
            case 'success':
                return { 
                    bg: 'rgba(20, 40, 20, 0.95)', 
                    border: 'rgba(46, 204, 113, 0.3)', 
                    icon: '#2ecc71',
                    progress: '#2ecc71'
                };
            case 'error':
                return { 
                    bg: 'rgba(40, 20, 20, 0.95)', 
                    border: 'rgba(231, 76, 60, 0.3)', 
                    icon: '#e74c3c',
                    progress: '#e74c3c'
                };
            case 'warning':
                return { 
                    bg: 'rgba(40, 35, 20, 0.95)', 
                    border: 'rgba(241, 196, 15, 0.3)', 
                    icon: '#f1c40f',
                    progress: '#f1c40f'
                };
            default:
                return { 
                    bg: 'rgba(30, 30, 30, 0.95)', 
                    border: 'rgba(52, 152, 219, 0.3)', 
                    icon: '#3498db',
                    progress: '#3498db'
                };
        }
    };

    const config = getColors();

    return (
        <Animated.View
            style={[
                styles.container,
                {
                    opacity: fadeAnim,
                    transform: [{ translateY: slideAnim }],
                },
            ]}
        >
            <TouchableOpacity
                style={[styles.content, { backgroundColor: config.bg, borderColor: config.border }]}
                onPress={() => {
                    if (onPress) onPress();
                    handleDismiss();
                }}
                activeOpacity={0.9}
            >
                <View style={styles.mainContent}>
                    {showIcon && (
                        <View style={[styles.iconContainer, { backgroundColor: 'rgba(255, 255, 255, 0.05)' }]}>
                            <Icon name={getIconName()} size={24} color={config.icon} />
                        </View>
                    )}
                    <View style={styles.textContainer}>
                        <Text style={styles.message} numberOfLines={2}>{message}</Text>
                    </View>
                    <TouchableOpacity style={styles.closeButton} onPress={handleDismiss}>
                        <Icon name="close-outline" size={20} color="rgba(255, 255, 255, 0.5)" />
                    </TouchableOpacity>
                </View>
                <View style={styles.progressContainer}>
                    <Animated.View 
                        style={[
                            styles.progressBar, 
                            { 
                                backgroundColor: config.progress,
                                width: progressAnim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: ['0%', '100%']
                                })
                            }
                        ]} 
                    />
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 50, // Display at top for better visibility
        left: 20,
        right: 20,
        zIndex: 99999,
        elevation: 1000,
        alignItems: 'center',
    },
    content: {
        borderRadius: 16,
        borderWidth: 1,
        width: '100%',
        overflow: 'hidden',
        ...Shadows.md,
    },
    mainContent: {
        flexDirection: 'row-reverse', // RTL Support
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
    },
    iconContainer: {
        marginLeft: 12,
        width: 36,
        height: 36,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    textContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    message: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
        textAlign: 'right',
        lineHeight: 20,
    },
    closeButton: {
        padding: 4,
        marginRight: 4,
    },
    progressContainer: {
        height: 3,
        width: '100%',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        flexDirection: 'row-reverse',
    },
    progressBar: {
        height: '100%',
    },
});

export default ToastNotification;
