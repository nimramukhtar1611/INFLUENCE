import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, XCircle, Loader, Mail, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const { verifyEmail, sendVerificationEmail } = useAuth();
  
  const [status, setStatus] = useState('loading'); // loading, success, error
  const [message, setMessage] = useState('');
  const [resendDisabled, setResendDisabled] = useState(false);
  const [timer, setTimer] = useState(60);

  useEffect(() => {
    if (token) {
      verifyEmailToken();
    }
  }, [token]);

  useEffect(() => {
    if (resendDisabled && timer > 0) {
      const interval = setInterval(() => {
        setTimer(prev => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    } else if (timer === 0) {
      setResendDisabled(false);
    }
  }, [resendDisabled, timer]);

  const verifyEmailToken = async () => {
    const result = await verifyEmail(token);
    if (result.success) {
      setStatus('success');
      setMessage('Your email has been verified successfully!');
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } else {
      setStatus('error');
      setMessage(result.error || 'Failed to verify email. The link may be expired.');
    }
  };

  const handleResend = async () => {
    setResendDisabled(true);
    setTimer(60);
    const result = await sendVerificationEmail();
    if (result.success) {
      setStatus('info');
      setMessage('Verification email sent! Please check your inbox.');
    } else {
      setStatus('error');
      setMessage(result.error || 'Failed to send verification email.');
    }
  };

  const renderContent = () => {
    switch(status) {
      case 'loading':
        return (
          <div className="text-center">
            <Loader className="w-16 h-16 text-purple-600 animate-spin mx-auto mb-8" />
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Verifying Email...</h2>
            <p className="text-gray-600">Please wait while we verify your email address.</p>
          </div>
        );

      case 'success':
        return (
          <div className="text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-8">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Email Verified!</h2>
            <p className="text-gray-600 mb-8">{message}</p>
            <p className="text-sm text-gray-500">Redirecting to login...</p>
          </div>
        );

      case 'error':
        return (
          <div className="text-center">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-8">
              <XCircle className="w-10 h-10 text-red-600" />
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Verification Failed</h2>
            <p className="text-gray-600 mb-8">{message}</p>
            <div className="space-y-4">
              <button
                onClick={handleResend}
                disabled={resendDisabled}
                className="w-full bg-purple-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 transition-colors"
              >
                {resendDisabled ? `Resend in ${timer}s` : 'Resend email'}
              </button>
              <Link
                to="/"
                className="inline-flex items-center text-purple-600 hover:text-purple-700 font-medium transition-colors"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Return to Site
              </Link>
            </div>
          </div>
        );

      case 'info':
        return (
          <div className="text-center">
            <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-8">
              <CheckCircle className="w-10 h-10 text-purple-600" />
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Email Sent!</h2>
            <p className="text-gray-600 mb-8">{message}</p>
            <Link
              to="/"
              className="inline-flex items-center text-purple-600 hover:text-purple-700 font-medium transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Return to Site
            </Link>
          </div>
        );

      default:
        // Default state - show email verification waiting screen
        return (
          <div className="text-center">
            <div 
className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-8">
              <Mail className="w-10 h-10 text-purple-600" />
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Verify your email address</h2>
            <p className="text-gray-600 mb-2">
              We've sent a verification link to <span className="font-medium text-gray-900">[[user.email_to_verify]]</span>
            </p>
            <p className="text-gray-500 text-sm mb-8">
              If you don't see the email, check your spam folder.
            </p>
            <div className="space-y-4">
              <button
                onClick={handleResend}
                disabled={resendDisabled}
                className="w-full bg-purple-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 transition-colors"
              >
                {resendDisabled ? `Resend in ${timer}s` : 'Resend email'}
              </button>
              <Link
                to="/"
                className="inline-flex items-center text-purple-600 hover:text-purple-700 font-medium transition-colors"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Return to Site
              </Link>
            </div>
            <p className="text-gray-400 text-xs mt-8">
              You can reach us at if you have any questions
            </p>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
        {renderContent()}
      </div>
    </div>
  );
};

export default VerifyEmail;