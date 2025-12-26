import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, Mail } from 'lucide-react';

const EmailVerificationPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [verificationStatus, setVerificationStatus] = useState<'loading' | 'success' | 'error' | 'pending'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    const type = searchParams.get('type');

    if (token && type === 'email') {
      verifyEmail(token);
    } else {
      setVerificationStatus('pending');
      setMessage('Please check your email for a verification link.');
    }
  }, [searchParams]);

  const verifyEmail = async (token: string) => {
    try {
      const { error } = await supabase.auth.verifyOtp({
        token_hash: token,
        type: 'email'
      });

      if (error) {
        setVerificationStatus('error');
        setMessage('Email verification failed. The link may be expired or invalid.');
      } else {
        setVerificationStatus('success');
        setMessage('Your email has been successfully verified!');
        setTimeout(() => {
          navigate('/');
        }, 3000);
      }
    } catch (error) {
      setVerificationStatus('error');
      setMessage('An unexpected error occurred during verification.');
    }
  };

  const resendVerification = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        const { error } = await supabase.auth.resend({
          type: 'signup',
          email: user.email
        });

        if (error) {
          setMessage('Failed to resend verification email.');
        } else {
          setMessage('Verification email sent! Please check your inbox.');
        }
      }
    } catch (error) {
      setMessage('Failed to resend verification email.');
    }
  };

  const getIcon = () => {
    switch (verificationStatus) {
      case 'success':
        return <CheckCircle className="h-12 w-12 text-green-500" />;
      case 'error':
        return <XCircle className="h-12 w-12 text-red-500" />;
      default:
        return <Mail className="h-12 w-12 text-blue-500" />;
    }
  };

  const getTitle = () => {
    switch (verificationStatus) {
      case 'success':
        return 'Email Verified!';
      case 'error':
        return 'Verification Failed';
      default:
        return 'Email Verification';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            {getIcon()}
          </div>
          <CardTitle className="text-2xl">{getTitle()}</CardTitle>
          <CardDescription>
            {verificationStatus === 'loading' ? 'Verifying your email...' : 'Email verification status'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertDescription>{message}</AlertDescription>
          </Alert>

          <div className="space-y-2">
            {verificationStatus === 'success' && (
              <Button 
                onClick={() => navigate('/')} 
                className="w-full"
              >
                Continue to App
              </Button>
            )}

            {verificationStatus === 'error' && (
              <Button 
                onClick={resendVerification} 
                variant="outline" 
                className="w-full"
              >
                Resend Verification Email
              </Button>
            )}

            {verificationStatus === 'pending' && (
              <Button 
                onClick={resendVerification} 
                className="w-full"
              >
                Resend Verification Email
              </Button>
            )}

            <Button 
              onClick={() => navigate('/auth')} 
              variant="ghost" 
              className="w-full"
            >
              Back to Login
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmailVerificationPage;