import React, { useState, useRef, useEffect } from 'react';
import { Mail, Phone, Smartphone, ArrowLeft, ArrowRight, RefreshCw, Shield } from 'lucide-react';

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
        return <Mail className="w-12 h-12 text-white" />;
      case 'phone':
        return <Phone className="w-12 h-12 text-white" />;
      default:
        return <Smartphone className="w-12 h-12 text-white" />;
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{
        background: '#000000',
      }}
    >
      <div className="w-full p-4 sm:p-6 md:p-8" style={{ maxWidth: 480 }}>
        {/* mobile logo */}
        <div className="flex lg:hidden items-center gap-2 mb-8">
          <div
            style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'linear-gradient(135deg,#667eea,#764ba2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Shield className="text-white" size={18} />
          </div>
          <span
            style={{
              fontSize: 18, fontWeight: 700,
              color: '#111827',
            }}
          >
            InfluenceX
          </span>
        </div>

        {/* heading */}
        <div className="mb-8">
          <div className="flex justify-center mb-6">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{
                background: '#1a1a1a',
              }}
            >
              {getIcon()}
            </div>
          </div>
          
          <h2
            style={{
              fontSize: 28, fontWeight: 800, letterSpacing: '-0.5px',
              color: '#ffffff', marginBottom: 8, textAlign: 'center',
            }}
          >
            Verify Your {type === 'email' ? 'Email' : 'Phone'}
          </h2>
          <p style={{ color: '#cccccc', fontSize: 15, textAlign: 'center', lineHeight: 1.6 }}>
            We've sent a verification code to<br />
            <span style={{ color: '#ffffff', fontWeight: 600 }}>{destination}</span>
          </p>
        </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* OTP Inputs */}
            <div className="flex justify-center gap-2">
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
                  disabled={loading}
                  style={{
                    width: 48,
                    height: 48,
                    textAlign: 'center',
                    fontSize: 20,
                    fontWeight: 600,
                    border: '1.5px solid #333333',
                    borderRadius: 10,
                    background: '#1a1a1a',
                    color: '#ffffff',
                    outline: 'none',
                    transition: 'all 0.15s',
                    boxSizing: 'border-box',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#666666';
                    e.target.style.background = '#1a1a1a';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#333333';
                    e.target.style.background = '#1a1a1a';
                  }}
                />
              ))}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={otp.join('').length !== 6 || loading}
              style={{
                width: '100%',
                padding: '13px 20px',
                borderRadius: 10,
                border: '1px solid #333333',
                background: (otp.join('').length !== 6 || loading) ? '#1a1a1a' : '#333333',
                color: '#fff',
                fontSize: 15,
                fontWeight: 700,
                cursor: (otp.join('').length !== 6 || loading) ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                transition: 'opacity 0.2s, transform 0.1s',
                letterSpacing: '0.01em',
              }}
              onMouseEnter={(e) => { 
                if (otp.join('').length === 6 && !loading) e.target.style.background = '#404040'; 
              }}
              onMouseLeave={(e) => { e.target.style.background = '#333333'; }}
            >
              {loading ? (
                <div
                  style={{
                    width: 20, height: 20, borderRadius: '50%',
                    border: '2px solid rgba(255,255,255,0.4)',
                    borderTopColor: '#fff',
                    animation: 'spin 0.7s linear infinite',
                  }}
                />
              ) : (
                <>
                  Verify
                  <ArrowRight size={17} />
                </>
              )}
            </button>
          </form>

          {/* Resend Code */}
          <div className="mt-6 text-center">
            {!canResend ? (
              <p style={{ color: '#cccccc', fontSize: 14 }}>
                Resend code in <span style={{ color: '#ffffff', fontWeight: 600 }}>{timer}s</span>
              </p>
            ) : (
              <button
                onClick={handleResend}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#ffffff',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  margin: '0 auto',
                  transition: 'color 0.15s',
                }}
                onMouseEnter={(e) => { e.target.style.color = '#cccccc'; }}
                onMouseLeave={(e) => { e.target.style.color = '#ffffff'; }}
              >
                <RefreshCw size={14} />
                Resend Code
              </button>
            )}
          </div>

          {onBack && (
            <button
              onClick={onBack}
              style={{
                background: 'none',
                border: 'none',
                color: '#cccccc',
                fontSize: 14,
                cursor: 'pointer',
                display: 'block',
                width: '100%',
                textAlign: 'center',
                marginTop: 16,
                transition: 'color 0.15s',
              }}
              onMouseEnter={(e) => { e.target.style.color = '#ffffff'; }}
              onMouseLeave={(e) => { e.target.style.color = '#cccccc'; }}
            >
              <ArrowLeft size={14} className="inline mr-2" />
              Back to Sign Up
            </button>
          )}

          {/* Security Note */}
          <div
            style={{
              marginTop: 24,
              padding: '14px 16px',
              borderRadius: 10,
              background: '#1a1a1a',
              border: '1.5px solid #333333',
            }}
          >
            <div className="flex items-start gap-3">
              <Shield size={16} style={{ color: '#667eea', marginTop: 2 }} />
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#ffffff', marginBottom: 4 }}>
                  Secure Verification
                </p>
                <p style={{ fontSize: 11, color: '#cccccc', lineHeight: 1.5 }}>
                  Your code expires in 10 minutes. Never share this code with anyone.
                </p>
              </div>
            </div>
          </div>

          <div
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 6, paddingTop: 8,
            }}
          >
            <Shield size={11} style={{ color: '#cccccc' }} />
            <span style={{ fontSize: 11, color: '#cccccc' }}>
              Your information is secure and encrypted
            </span>
          </div>
        </div>
      </div>
  );
};

export default OTPVerification;