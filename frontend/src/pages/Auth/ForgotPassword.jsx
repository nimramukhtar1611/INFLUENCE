import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, Send, Shield } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const { forgotPassword, loading } = useAuth();
  const [errors, setErrors] = useState({});

  const validate = () => {
    const newErrors = {};
    if (!email) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = 'Invalid email';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    const result = await forgotPassword(email);
    if (result.success) {
      setSubmitted(true);
      toast.success('Reset link sent successfully!');
    }
  };

  if (submitted) {
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
              Reset your<br />password securely.
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 17, lineHeight: 1.7, maxWidth: 360 }}>
              We've sent you a password reset link. Check your email and follow the instructions to reset your password.
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

            {/* success content */}
            <div className="text-center">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
                style={{
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                }}
              >
                <Send className="text-white" size={24} />
              </div>
              
              <h2
                style={{
                  fontSize: 30, fontWeight: 800, letterSpacing: '-0.5px',
                  color: '#111827', marginBottom: 12,
                }}
              >
                Check Your Email
              </h2>
              
              <p style={{ color: '#6b7280', fontSize: 15, marginBottom: 24, lineHeight: 1.6 }}>
                We've sent a password reset link to<br />
                <strong style={{ color: '#667eea' }}>{email}</strong>
              </p>

              <p style={{ color: '#9ca3af', fontSize: 13, marginBottom: 32 }}>
                Didn't receive the email? Check your spam folder or{' '}
                <button 
                  onClick={() => setSubmitted(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#667eea',
                    fontWeight: 600,
                    cursor: 'pointer',
                    textDecoration: 'underline',
                  }}
                >
                  try again
                </button>
              </p>

              <Link
                to="/login"
                className="inline-flex items-center justify-center w-full py-3 px-4 rounded-lg font-medium transition-all"
                style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: '#fff',
                  textDecoration: 'none',
                }}
                onMouseEnter={(e) => { e.target.style.opacity = '0.92'; }}
                onMouseLeave={(e) => { e.target.style.opacity = '1'; }}
              >
                <ArrowLeft size={16} className="mr-2" />
                Back to Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
            Reset your<br />password securely.
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 17, lineHeight: 1.7, maxWidth: 360 }}>
            Enter your email address and we'll send you a link to reset your password. Keep your account secure with a strong password.
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
            <h2
              style={{
                fontSize: 30, fontWeight: 800, letterSpacing: '-0.5px',
                color: '#111827', marginBottom: 6,
              }}
            >
              Forgot password?
            </h2>
            <p style={{ color: '#6b7280', fontSize: 15 }}>
              Enter your email address and we'll send you a link to reset your password.
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Email */}
            <div>
              <label
                style={{
                  display: 'block', fontSize: 13, fontWeight: 600,
                  color: '#374151', marginBottom: 6,
                }}
              >
                Email address
              </label>
              <div style={{ position: 'relative' }}>
                <Mail
                  size={16}
                  style={{
                    position: 'absolute', left: 14, top: '50%',
                    transform: 'translateY(-50%)',
                    color: errors.email ? '#ef4444' : '#9ca3af',
                  }}
                />
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errors.email) setErrors({ ...errors, email: null });
                  }}
                  style={{
                    width: '100%',
                    padding: '12px 14px 12px 40px',
                    borderRadius: 10,
                    border: `1.5px solid ${errors.email ? '#ef4444' : '#e5e7eb'}`,
                    background: '#f9fafb',
                    color: '#111827',
                    fontSize: 14,
                    outline: 'none',
                    transition: 'border-color 0.15s',
                    boxSizing: 'border-box',
                  }}
                  onFocus={(e) => { e.target.style.borderColor = '#667eea'; e.target.style.background = '#fff'; }}
                  onBlur={(e) => { e.target.style.borderColor = errors.email ? '#ef4444' : '#e5e7eb'; e.target.style.background = '#f9fafb'; }}
                />
              </div>
              {errors.email && (
                <p style={{ marginTop: 5, fontSize: 12, color: '#ef4444' }}>{errors.email}</p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '13px 20px',
                borderRadius: 10,
                border: 'none',
                background: loading ? '#a5b4fc' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: '#fff',
                fontSize: 15,
                fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                transition: 'opacity 0.2s, transform 0.1s',
                letterSpacing: '0.01em',
              }}
              onMouseEnter={(e) => { if (!loading) e.target.style.opacity = '0.92'; }}
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
                  Send Reset Link
                  <Send size={17} />
                </>
              )}
            </button>
          </form>

          {/* Footer links */}
          <div className="mt-6 text-center">
            <Link
              to="/login"
              className="inline-flex items-center"
              style={{
                fontSize: 14, color: '#667eea', fontWeight: 600,
                textDecoration: 'none', transition: 'color 0.15s',
              }}
              onMouseEnter={(e) => { e.target.style.color = '#5a67d8'; }}
              onMouseLeave={(e) => { e.target.style.color = '#667eea'; }}
            >
              <ArrowLeft size={16} className="mr-2" />
              Back to Login
            </Link>
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
        input::placeholder { color: #9ca3af; }
      `}</style>
    </div>
  );
};

export default ForgotPassword;