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
        className="min-h-screen flex items-center justify-center"
        style={{
          background: '#000000',
        }}
      >
        <div className="w-full p-4 sm:p-6 md:p-8" style={{ maxWidth: 480 }}>
            {/* success content */}
            <div className="text-center">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
                style={{
                  background: '#1a1a1a',
                }}
              >
                <Send className="text-white" size={24} />
              </div>
              
              <h2
                style={{
                  fontSize: 'clamp(24px, 5vw, 28px)', fontWeight: 800, letterSpacing: '-0.5px',
                  color: '#ffffff', marginBottom: 12,
                }}
              >
                Check Your Email
              </h2>
              
              <p style={{ color: '#cccccc', fontSize: 'clamp(14px, 3vw, 15px)', marginBottom: 24, lineHeight: 1.6 }}>
                We've sent a password reset link to<br />
                <strong style={{ color: '#ffffff' }}>{email}</strong>
              </p>

              <p style={{ color: '#cccccc', fontSize: 'clamp(12px, 2.5vw, 13px)', marginBottom: 32 }}>
                Didn't receive email? Check your spam folder or{' '}
                <button 
                  onClick={() => setSubmitted(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#ffffff',
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
                  background: '#333333',
                  color: '#fff',
                  textDecoration: 'none',
                }}
                onMouseEnter={(e) => { e.target.style.background = '#404040'; }}
                onMouseLeave={(e) => { e.target.style.background = '#333333'; }}
              >
                <ArrowLeft size={16} className="mr-2" />
                Back to Login
              </Link>
            </div>
          </div>
      </div>
    );
  }

  return (
    <>
      <div
        className="min-h-screen flex items-center justify-center"
        style={{
          background: '#000000',
        }}
      >
        <div className="w-full p-4 sm:p-6 md:p-8" style={{ maxWidth: 480 }}>
            {/* heading */}
            <div className="mb-8">
              <h2
                style={{
                  fontSize: 'clamp(24px, 5vw, 28px)', fontWeight: 800, letterSpacing: '-0.5px',
                  color: '#ffffff', marginBottom: 8,
                }}
              >
                Forgot password?
              </h2>
              <p style={{ color: '#cccccc', fontSize: 'clamp(14px, 3vw, 15px)', lineHeight: 1.5 }}>
                Enter your email address and we'll send you a link to reset your password.
              </p>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Email */}
              <div>
                <label
                  style={{
                    display: 'block', fontSize: 14, fontWeight: 600,
                    color: '#ffffff', marginBottom: 8,
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
                      color: errors.email ? '#ff4444' : '#cccccc',
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
                      padding: '14px 16px 14px 42px',
                      borderRadius: 10,
                      border: `1.5px solid ${errors.email ? '#ff4444' : '#333333'}`,
                      background: '#1a1a1a',
                      color: '#ffffff',
                      fontSize: 14,
                      outline: 'none',
                      transition: 'border-color 0.15s',
                      boxSizing: 'border-box',
                    }}
                    onFocus={(e) => { e.target.style.borderColor = '#666666'; e.target.style.background = '#1a1a1a'; }}
                    onBlur={(e) => { e.target.style.borderColor = errors.email ? '#ff4444' : '#333333'; e.target.style.background = '#1a1a1a'; }}
                  />
                </div>
                {errors.email && (
                  <p style={{ marginTop: 5, fontSize: 12, color: '#ff4444' }}>{errors.email}</p>
                )}
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '14px 20px',
                  borderRadius: 10,
                  border: '1px solid #333333',
                  background: loading ? '#1a1a1a' : '#333333',
                  color: '#fff',
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  transition: 'opacity 0.2s, transform 0.1s',
                  letterSpacing: '0.01em',
                }}
                onMouseEnter={(e) => { if (!loading) e.target.style.background = '#404040'; }}
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
                    Send Reset Link
                    <Send size={17} />
                  </>
                )}
              </button>
            </form>

            {/* Footer links */}
            <div className="mt-6 text-center">
              <div style={{ textAlign: 'center', marginTop: 24 }}>
                <span style={{ fontSize: 13, color: '#cccccc' }}>
                  Remember your password?{' '}
                </span>
                <Link
                  to="/login"
                  style={{
                    fontSize: 13, fontWeight: 600,
                    color: '#ffffff', textDecoration: 'none',
                  }}
                  onMouseEnter={(e) => { e.target.style.color = '#cccccc'; }}
                  onMouseLeave={(e) => { e.target.style.color = '#ffffff'; }}
                >
                  Sign in
                </Link>
              </div>
              
              <Link
                to="/login"
                className="inline-flex items-center"
                style={{
                  fontSize: 12, color: '#cccccc', fontWeight: 600,
                  textDecoration: 'none', transition: 'color 0.15s',
                }}
                onMouseEnter={(e) => { e.target.style.color = '#ffffff'; }}
                onMouseLeave={(e) => { e.target.style.color = '#cccccc'; }}
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
              <Shield size={11} style={{ color: '#cccccc' }} />
              <span style={{ fontSize: 11, color: '#cccccc' }}>
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
      </>
    );
};

export default ForgotPassword;