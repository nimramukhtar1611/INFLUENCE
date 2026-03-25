import React, { useState, useRef, useEffect } from 'react';
import { Mail, Phone, Smartphone, ArrowRight, RefreshCw, Shield } from 'lucide-react';

const OTPVerification = ({ 
  type = 'email',
  destination, 
  onVerify, 
  onResend,
  onBack,
  loading = false 
}) => {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const inputRefs = useRef([]);

  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => {
        setTimer(prev => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setCanResend(true);
    }
  }, [timer]);

  const handleChange = (index, value) => {
    if (value.length > 1) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1].focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text/plain').slice(0, 6);
    if (/^\d+$/.test(pastedData)) {
      const digits = pastedData.split('');
      const newOtp = [...otp];
      digits.forEach((digit, index) => {
        if (index < 6) newOtp[index] = digit;
      });
      setOtp(newOtp);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const otpString = otp.join('');
    if (otpString.length === 6) {
      onVerify(otpString);
    }
  };

  const handleResend = () => {
    onResend();
    setTimer(60);
    setCanResend(false);
  };

  const getIcon = () => {
    switch(type) {
      case 'email':
        return <Mail className="w-12 h-12 text-indigo-600" />;
      case 'phone':
        return <Phone className="w-12 h-12 text-indigo-600" />;
      default:
        return <Smartphone className="w-12 h-12 text-indigo-600" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-white flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-lg">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            {getIcon()}
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Verify Your {type === 'email' ? 'Email' : 'Phone'}
          </h2>
          <p className="text-gray-600">
            We've sent a verification code to{' '}
            <span className="font-medium text-gray-900">{destination}</span>
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="flex justify-center gap-2 mb-6">
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={el => inputRefs.current[index] = el}
                type="text"
                maxLength="1"
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={index === 0 ? handlePaste : undefined}
                className="w-12 h-12 text-center text-xl font-semibold border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                disabled={loading}
              />
            ))}
          </div>

          <button
            type="submit"
            disabled={otp.join('').length !== 6 || loading}
            className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {loading ? (
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                Verify
                <ArrowRight className="ml-2 w-5 h-5" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          {!canResend ? (
            <p className="text-sm text-gray-600">
              Resend code in <span className="font-medium text-indigo-600">{timer}s</span>
            </p>
          ) : (
            <button
              onClick={handleResend}
              className="text-indigo-600 hover:text-indigo-700 text-sm font-medium flex items-center justify-center mx-auto"
            >
              <RefreshCw className="w-4 h-4 mr-1" />
              Resend Code
            </button>
          )}
        </div>

        {onBack && (
          <button
            onClick={onBack}
            className="mt-4 text-sm text-gray-600 hover:text-gray-900 block text-center w-full"
          >
            ← Back to Sign Up
          </button>
        )}

        {/* Security Note */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-indigo-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-gray-900">Secure Verification</p>
              <p className="text-xs text-gray-500 mt-1">
                Your code expires in 10 minutes. Never share this code with anyone.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OTPVerification;