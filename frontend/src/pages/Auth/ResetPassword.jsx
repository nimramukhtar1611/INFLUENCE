import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, Eye, EyeOff, ArrowLeft, CheckCircle, Shield } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const newErrors = {};
    if (!formData.newPassword) {
      newErrors.newPassword = 'Password is required';
    } else if (formData.newPassword.length < 8) {
      newErrors.newPassword = 'Password must be at least 8 characters';
    } else if (!/[A-Z]/.test(formData.newPassword)) {
      newErrors.newPassword = 'Must contain at least one uppercase letter';
    } else if (!/[0-9]/.test(formData.newPassword)) {
      newErrors.newPassword = 'Must contain at least one number';
    }
    if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    if (!token) {
      toast.error('Invalid or missing reset token');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/auth/reset-password', {
        token,
        newPassword: formData.newPassword
      });

      if (response.data?.success) {
        setSuccess(true);
        toast.success('Password reset successfully!');
        setTimeout(() => navigate('/login'), 3000);
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to reset password';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
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
              Invalid reset<br />link detected.
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 17, lineHeight: 1.7, maxWidth: 360 }}>
              This password reset link is invalid or has expired. Please request a new reset link to continue.
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

            {/* error content */}
            <div className="text-center">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
                style={{
                  background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                }}
              >
                <Lock className="text-white" size={24} />
              </div>
              
              <h2
                style={{
                  fontSize: 30, fontWeight: 800, letterSpacing: '-0.5px',
                  color: '#111827', marginBottom: 12,
                }}
              >
                Invalid Link
              </h2>
              
              <p style={{ color: '#6b7280', fontSize: 15, marginBottom: 32, lineHeight: 1.6 }}>
                This password reset link is invalid or has expired.
              </p>

              <Link
                to="/forgot-password"
                className="inline-flex items-center justify-center w-full py-3 px-4 rounded-lg font-medium transition-all"
                style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: '#fff',
                  textDecoration: 'none',
                }}
                onMouseEnter={(e) => { e.target.style.opacity = '0.92'; }}
                onMouseLeave={(e) => { e.target.style.opacity = '1'; }}
              >
                Request a new link
                <ArrowLeft size={16} className="ml-2" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
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
              Password reset<br />successful!
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 17, lineHeight: 1.7, maxWidth: 360 }}>
              Your password has been reset successfully. You can now login with your new password.
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
                <CheckCircle className="text-white" size={24} />
              </div>
              
              <h2
                style={{
                  fontSize: 30, fontWeight: 800, letterSpacing: '-0.5px',
                  color: '#111827', marginBottom: 12,
                }}
              >
                Password Reset!
              </h2>
              
              <p style={{ color: '#6b7280', fontSize: 15, marginBottom: 32, lineHeight: 1.6 }}>
                Your password has been reset successfully. Redirecting to login...
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
                Go to Login
                <ArrowLeft size={16} className="ml-2" />
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
            Create a new<br />secure password.
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 17, lineHeight: 1.7, maxWidth: 360 }}>
            Choose a strong password to protect your account. Make sure it's unique and hard to guess.
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
              Reset password
            </h2>
            <p style={{ color: '#6b7280', fontSize: 15 }}>
              Enter your new password below.
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* New Password */}
            <div>
              <label
                style={{
                  display: 'block', fontSize: 13, fontWeight: 600,
                  color: '#374151', marginBottom: 6,
                }}
              >
                New Password
              </label>
              <div style={{ position: 'relative' }}>
                <Lock
                  size={16}
                  style={{
                    position: 'absolute', left: 14, top: '50%',
                    transform: 'translateY(-50%)',
                    color: errors.newPassword ? '#ef4444' : '#9ca3af',
                  }}
                />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter new password"
                  value={formData.newPassword}
                  onChange={(e) => {
                    setFormData({...formData, newPassword: e.target.value});
                    if (errors.newPassword) setErrors({...errors, newPassword: null});
                  }}
                  style={{
                    width: '100%',
                    padding: '12px 44px 12px 40px',
                    borderRadius: 10,
                    border: `1.5px solid ${errors.newPassword ? '#ef4444' : '#e5e7eb'}`,
                    background: '#f9fafb',
                    color: '#111827',
                    fontSize: 14,
                    outline: 'none',
                    transition: 'border-color 0.15s',
                    boxSizing: 'border-box',
                  }}
                  onFocus={(e) => { e.target.style.borderColor = '#667eea'; e.target.style.background = '#fff'; }}
                  onBlur={(e) => { e.target.style.borderColor = errors.newPassword ? '#ef4444' : '#e5e7eb'; e.target.style.background = '#f9fafb'; }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute', right: 14, top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                    color: '#9ca3af',
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.newPassword && (
                <p style={{ marginTop: 5, fontSize: 12, color: '#ef4444' }}>{errors.newPassword}</p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label
                style={{
                  display: 'block', fontSize: 13, fontWeight: 600,
                  color: '#374151', marginBottom: 6,
                }}
              >
                Confirm Password
              </label>
              <div style={{ position: 'relative' }}>
                <Lock
                  size={16}
                  style={{
                    position: 'absolute', left: 14, top: '50%',
                    transform: 'translateY(-50%)',
                    color: errors.confirmPassword ? '#ef4444' : '#9ca3af',
                  }}
                />
                <input
                  type={showConfirm ? 'text' : 'password'}
                  placeholder="Confirm new password"
                  value={formData.confirmPassword}
                  onChange={(e) => {
                    setFormData({...formData, confirmPassword: e.target.value});
                    if (errors.confirmPassword) setErrors({...errors, confirmPassword: null});
                  }}
                  style={{
                    width: '100%',
                    padding: '12px 44px 12px 40px',
                    borderRadius: 10,
                    border: `1.5px solid ${errors.confirmPassword ? '#ef4444' : '#e5e7eb'}`,
                    background: '#f9fafb',
                    color: '#111827',
                    fontSize: 14,
                    outline: 'none',
                    transition: 'border-color 0.15s',
                    boxSizing: 'border-box',
                  }}
                  onFocus={(e) => { e.target.style.borderColor = '#667eea'; e.target.style.background = '#fff'; }}
                  onBlur={(e) => { e.target.style.borderColor = errors.confirmPassword ? '#ef4444' : '#e5e7eb'; e.target.style.background = '#f9fafb'; }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  style={{
                    position: 'absolute', right: 14, top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                    color: '#9ca3af',
                  }}
                >
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p style={{ marginTop: 5, fontSize: 12, color: '#ef4444' }}>{errors.confirmPassword}</p>
              )}
            </div>

            {/* Password Requirements */}
            <div
              style={{
                padding: '12px 14px',
                borderRadius: 10,
                background: '#f9fafb',
                border: '1.5px solid #e5e7eb',
              }}
            >
              <p style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
                Password requirements:
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <p style={{ 
                  fontSize: 11, 
                  color: formData.newPassword.length >= 8 ? '#10b981' : '#9ca3af',
                  margin: 0,
                }}>
                  {formData.newPassword.length >= 8 ? '·' : '·'} At least 8 characters
                </p>
                <p style={{ 
                  fontSize: 11, 
                  color: /[A-Z]/.test(formData.newPassword) ? '#10b981' : '#9ca3af',
                  margin: 0,
                }}>
                  {/[A-Z]/.test(formData.newPassword) ? '·' : '·'} One uppercase letter
                </p>
                <p style={{ 
                  fontSize: 11, 
                  color: /[0-9]/.test(formData.newPassword) ? '#10b981' : '#9ca3af',
                  margin: 0,
                }}>
                  {/[0-9]/.test(formData.newPassword) ? '·' : '·'} One number
                </p>
              </div>
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
                'Reset Password'
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

export default ResetPassword;