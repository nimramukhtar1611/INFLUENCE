import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, XCircle, Loader } from 'lucide-react';
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
            <Loader className="w-16 h-16 text-indigo-600 animate-spin mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Verifying Email...</h2>
            <p className="text-gray-600">Please wait while we verify your email address.</p>
          </div>
        );

      case 'success':
        return (
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Email Verified!</h2>
            <p className="text-gray-600 mb-6">{message}</p>
            <p className="text-sm text-gray-500">Redirecting to login...</p>
          </div>
        );

      case 'error':
        return (
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Verification Failed</h2>
            <p className="text-gray-600 mb-6">{message}</p>
            <div className="space-y-3">
              <button
                onClick={handleResend}
                disabled={resendDisabled}
                className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50"
              >
                {resendDisabled ? `Resend in ${timer}s` : 'Resend Verification Email'}
              </button>
              <Link
                to="/login"
                className="block text-indigo-600 hover:text-indigo-700 text-sm"
              >
                Back to Login
              </Link>
            </div>
          </div>
        );

      case 'info':
        return (
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Email Sent!</h2>
            <p className="text-gray-600 mb-6">{message}</p>
            <Link
              to="/login"
              className="inline-block text-indigo-600 hover:text-indigo-700"
            >
              Back to Login
            </Link>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-white flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-lg">
        {renderContent()}
      </div>
    </div>
  );
};

export default VerifyEmail;