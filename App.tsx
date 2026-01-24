import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { AuthProvider, useAuth } from './src/components/auth/AuthProvider';
import { ToastProvider } from './src/providers/ToastProvider';
import { BackgroundProvider } from './src/providers/BackgroundProvider';
import AppNavigator from './src/navigation/AppNavigator';

/**
 * Inner component to access auth context and pass userId to BackgroundProvider
 */
function AppContent(): React.JSX.Element {
  const { user } = useAuth();

  return (
    <BackgroundProvider userId={user?.id || null}>
      <ToastProvider>
        <NavigationContainer>
          <AppNavigator />
        </NavigationContainer>
      </ToastProvider>
    </BackgroundProvider>
  );
}

/**
 * MyApp1 React Native App
 * Entry point that wraps the app with necessary providers
 */
function App(): React.JSX.Element {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;

