import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../services/supabase';

export interface GradientOption {
    id: string;
    name: string;
    colors: string[];
    isPremium?: boolean;
}

export const gradientOptions: GradientOption[] = [
    {
        id: 'spectrum-red',
        name: 'الأحمر الهادئ',
        colors: ['#3B0A0A', '#5C1A1A', '#3D1F2C'],
        isPremium: false,
    },
    {
        id: 'default',
        name: 'الأرجواني العميق',
        colors: ['#2D1F3D', '#1A1F2C', '#3D1F2C'],
        isPremium: true,
    },
    {
        id: 'velvet-rose-darker',
        name: 'الورد المخملي الداكن',
        colors: ['#14090e', '#4a1e34', '#9c3d1a'],
        isPremium: true,
    },
    {
        id: 'olive-obsidian',
        name: 'زيتون الأوبسيديان',
        colors: ['#0A0E0A', '#1F2D24', '#3B4A36'],
        isPremium: true,
    },
];

interface BackgroundContextType {
    selectedGradient: GradientOption;
    setGradient: (gradientId: string) => Promise<void>;
    isLoading: boolean;
    isPremiumUser: boolean;
}

const BackgroundContext = createContext<BackgroundContextType | undefined>(undefined);

export const useBackground = () => {
    const context = useContext(BackgroundContext);
    if (!context) {
        throw new Error('useBackground must be used within BackgroundProvider');
    }
    return context;
};

interface BackgroundProviderProps {
    children: ReactNode;
    userId?: string | null;
}

const STORAGE_KEY = '@app_background_preference';

export const BackgroundProvider: React.FC<BackgroundProviderProps> = ({ children, userId }) => {
    const [selectedGradient, setSelectedGradient] = useState<GradientOption>(gradientOptions[0]);
    const [isLoading, setIsLoading] = useState(true);
    const [isPremiumUser, setIsPremiumUser] = useState(false);

    // Load background preference on mount and when userId changes
    useEffect(() => {
        loadBackgroundPreference();
    }, [userId]);

    const loadBackgroundPreference = async () => {
        try {
            setIsLoading(true);

            let gradientId = 'spectrum-red';

            if (userId) {
                // Try to get from Supabase user metadata first
                const { data: { user } } = await supabase.auth.getUser();
                const metadataPreference = user?.user_metadata?.background_preference;

                if (metadataPreference) {
                    gradientId = metadataPreference;
                    // Check premium status
                    const isPremium = user?.user_metadata?.is_premium === true;
                    setIsPremiumUser(isPremium);
                    console.log('Loaded background from Supabase metadata:', gradientId, 'Premium:', isPremium);
                } else {
                    // Fall back to AsyncStorage
                    const storedPreference = await AsyncStorage.getItem(`${STORAGE_KEY}_${userId}`);
                    if (storedPreference) {
                        gradientId = storedPreference;
                        console.log('Loaded background from AsyncStorage:', gradientId);
                    }
                }
            } else {
                // No user logged in, use default
                console.log('No user logged in, using default background');
            }

            // Find the gradient option
            const gradient = gradientOptions.find(g => g.id === gradientId) || gradientOptions[0];
            setSelectedGradient(gradient);
        } catch (error) {
            console.error('Error loading background preference:', error);
            setSelectedGradient(gradientOptions[0]);
        } finally {
            setIsLoading(false);
        }
    };

    const setGradient = async (gradientId: string) => {
        try {
            const gradient = gradientOptions.find(g => g.id === gradientId);
            if (!gradient) {
                console.warn('Gradient not found:', gradientId);
                return;
            }

            // Update state immediately for instant feedback
            setSelectedGradient(gradient);

            // Save to AsyncStorage for local persistence
            if (userId) {
                await AsyncStorage.setItem(`${STORAGE_KEY}_${userId}`, gradientId);
                console.log('Saved background to AsyncStorage:', gradientId);

                // Save to Supabase for cross-device sync
                try {
                    const { error } = await supabase.auth.updateUser({
                        data: { background_preference: gradientId }
                    });

                    if (error) {
                        console.error('Error updating Supabase metadata:', error);
                    } else {
                        console.log('Saved background to Supabase metadata:', gradientId);
                    }
                } catch (supabaseError) {
                    console.error('Supabase update error:', supabaseError);
                    // Continue anyway since we saved to AsyncStorage
                }
            }
        } catch (error) {
            console.error('Error setting background:', error);
            throw error;
        }
    };

    if (isLoading) {
        // Prevent rendering children while loading background preference to avoid flicker
        return null;
    }

    return (
        <BackgroundContext.Provider value={{ selectedGradient, setGradient, isLoading, isPremiumUser }}>
            {children}
        </BackgroundContext.Provider>
    );
};
