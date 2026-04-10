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
      className="min-h-screen flex"
      style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      }}
    >
      {/* Left decorative panel */}
      <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-12 overflow-hidden">
        {/* floating blobs */}
        <div
          style={{
            position: 'absolute', width: 340, height: 340, borderRadius: '50%',
            background: 'rgba(255,255,255,0.08)', top: -80, left: -80,
          }}
        />
        <div
          style={{
            position: 'absolute', width: 220, height: 220, borderRadius: '50%',
            background: 'rgba(255,255,255,0.06)', bottom: 80, right: -40,
          }}
        />
        <div
          style={{
            position: 'absolute', width: 140, height: 140, borderRadius: '50%',
            background: 'rgba(255,255,255,0.1)', top: '45%', left: '60%',
          }}
        />

        {/* brand mark */}
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div
              style={{
                width: 44, height: 44, borderRadius: 12,
                background: 'rgba(255,255,255,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                backdropFilter: 'blur(8px)',
              }}
            >
              <Shield className="text-white" size={22} />
            </div>
            <span style={{ color: '#fff', fontSize: 22, fontWeight: 700, letterSpacing: '-0.5px' }}>
              InfluenceX
            </span>
          </div>
        </div>

        {/* hero copy */}
        <div className="relative z-10">
          <h1
            style={{
              color: '#fff', fontSize: 42, fontWeight: 800,
              lineHeight: 1.15, letterSpacing: '-1px', marginBottom: 20,
            }}
          >
            Verify your<br />{type === 'email' ? 'email' : 'phone'}.
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 17, lineHeight: 1.7, maxWidth: 360 }}>
            We've sent a verification code to {type === 'email' ? 'your email address' : 'your phone number'}. Enter the code below to continue.
          </p>

          {/* stats row */}
          <div className="flex gap-10 mt-10">
            {[
              { n: '12K+', label: 'Creators' },
              { n: '3K+', label: 'Brands' },
              { n: '98%', label: 'Satisfaction' },
            ].map(({ n, label }) => (
              <div key={label}>
                <p style={{ color: '#fff', fontSize: 26, fontWeight: 800 }}>{n}</p>
                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* bottom tag */}
        <div
          className="relative z-10 flex items-center gap-2"
          style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}
        >
          <Shield size={13} />
          <span>Your data is always secure and encrypted</span>
        </div>
      </div>

      {/* Right form panel */}
      <div
        className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-10"
        style={{
          background: '#fff',
          borderRadius: '0',
        }}
      >
        <div className="w-full" style={{ maxWidth: 420 }}>
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
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                }}
              >
                {getIcon()}
              </div>
            </div>
            
            <h2
              style={{
                fontSize: 30, fontWeight: 800, letterSpacing: '-0.5px',
                color: '#111827', marginBottom: 6, textAlign: 'center',
              }}
            >
              Verify Your {type === 'email' ? 'Email' : 'Phone'}
            </h2>
            <p style={{ color: '#6b7280', fontSize: 15, textAlign: 'center', lineHeight: 1.6 }}>
              We've sent a verification code to<br />
              <span style={{ color: '#667eea', fontWeight: 600 }}>{destination}</span>
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
                    border: '1.5px solid #e5e7eb',
                    borderRadius: 10,
                    background: '#f9fafb',
                    color: '#111827',
                    outline: 'none',
                    transition: 'all 0.15s',
                    boxSizing: 'border-box',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#667eea';
                    e.target.style.background = '#fff';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e5e7eb';
                    e.target.style.background = '#f9fafb';
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
                border: 'none',
                background: (otp.join('').length !== 6 || loading) ? '#a5b4fc' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: '#fff',
                fontSize: 15,
                fontWeight: 700,
                cursor: (otp.join('').length !== 6 || loading) ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                transition: 'opacity 0.2s, transform 0.1s',
                letterSpacing: '0.01em',
              }}
              onMouseEnter={(e) => { 
                if (otp.join('').length === 6 && !loading) e.target.style.opacity = '0.92'; 
              }}
              onMouseLeave={(e) => { e.target.style.opacity = '1'; }}
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
              <p style={{ color: '#9ca3af', fontSize: 14 }}>
                Resend code in <span style={{ color: '#667eea', fontWeight: 600 }}>{timer}s</span>
              </p>
            ) : (
              <button
                onClick={handleResend}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#667eea',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  margin: '0 auto',
                  transition: 'color 0.15s',
                }}
                onMouseEnter={(e) => { e.target.style.color = '#5a67d8'; }}
                onMouseLeave={(e) => { e.target.style.color = '#667eea'; }}
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
                color: '#9ca3af',
                fontSize: 14,
                cursor: 'pointer',
                display: 'block',
                width: '100%',
                textAlign: 'center',
                marginTop: 16,
                transition: 'color 0.15s',
              }}
              onMouseEnter={(e) => { e.target.style.color = '#6b7280'; }}
              onMouseLeave={(e) => { e.target.style.color = '#9ca3af'; }}
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
              background: '#f9fafb',
              border: '1.5px solid #e5e7eb',
            }}
          >
            <div className="flex items-start gap-3">
              <Shield size={16} style={{ color: '#667eea', marginTop: 2 }} />
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', marginBottom: 4 }}>
                  Secure Verification
                </p>
                <p style={{ fontSize: 11, color: '#6b7280', lineHeight: 1.5 }}>
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
            <Shield size={11} style={{ color: '#d1d5db' }} />
            <span style={{ fontSize: 11, color: '#9ca3af' }}>
              Your information is secure and encrypted
            </span>
          </div>
        </div>
      </div>

      {/* spin keyframe injected inline */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default OTPVerification;