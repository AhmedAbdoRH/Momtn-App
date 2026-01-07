import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { AuthProvider } from './src/components/auth/AuthProvider';
import { ToastProvider } from './src/providers/ToastProvider';
import AppNavigator from './src/navigation/AppNavigator';

/**
 * MyApp1 React Native App
 * Entry point that wraps the app with necessary providers
 */
function App(): React.JSX.Element {
  return (
    <AuthProvider>
      <ToastProvider>
        <NavigationContainer>
          <AppNavigator />
        </NavigationContainer>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
