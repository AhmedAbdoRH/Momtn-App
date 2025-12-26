
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./components/AuthProvider";
import ProtectedRoute from "./components/ProtectedRoute";
import { Toaster } from "./components/ui/toaster";
import NotFound from "./pages/NotFound";
import AuthPage from "./pages/AuthPage";
import EmailVerificationPage from "./pages/EmailVerificationPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import Index from "./pages/Index";
import SettingsPage from "./pages/SettingsPage";
import { useEffect } from "react";
import { applyGradientById } from "./components/BackgroundSettings";
import "./App.css";

const queryClient = new QueryClient();

function App() {
  // Apply user-specific gradient when app initializes
  useEffect(() => {
    // Apply default gradient initially
    console.log("App: Applying default gradient on load");
    applyGradientById("default");
    
    // Ensure the body takes up the full viewport height and remove any background
    document.body.style.minHeight = "100vh";
    document.body.style.margin = "0";
    document.body.style.padding = "0";
    document.documentElement.style.height = "100%";
    document.documentElement.style.minHeight = "100vh";
    
    // Listen for gradient changes from any part of the app
    const handleApplyGradient = (event: CustomEvent) => {
      const { gradientId, userId } = event.detail;
      if (gradientId) {
        console.log("App: Received gradient change event for user:", userId, gradientId);
        applyGradientById(gradientId);
        
        // Apply again after a short delay to ensure it sticks
        setTimeout(() => {
          applyGradientById(gradientId);
        }, 100);
      }
    };
    
    window.addEventListener('apply-gradient', handleApplyGradient as EventListener);
    
    return () => {
      window.removeEventListener('apply-gradient', handleApplyGradient as EventListener);
    };
  }, []);

  return (
    <Router>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <Routes>
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Index />
                </ProtectedRoute>
              }
            />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/verify-email" element={<EmailVerificationPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <SettingsPage />
                </ProtectedRoute>
              }
            />
            <Route path="/404" element={<NotFound />} />
            <Route path="*" element={<Navigate to="/404" />} />
          </Routes>
          <Toaster />
        </AuthProvider>
      </QueryClientProvider>
    </Router>
  );
}

export default App;