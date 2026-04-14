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
        className="min-h-screen flex items-center justify-center"
        style={{
          background: '#000000',
        }}
      >
        <div className="w-full p-4 sm:p-6 md:p-8" style={{ maxWidth: 480 }}>

            {/* error content */}
            <div className="text-center">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
                style={{
                  background: '#1a1a1a',
                }}
              >
                <Lock className="text-white" size={24} />
              </div>
              
              <h2
                style={{
                  fontSize: 'clamp(24px, 5vw, 28px)', fontWeight: 800, letterSpacing: '-0.5px',
                  color: '#ffffff', marginBottom: 12,
                }}
              >
                Invalid Link
              </h2>
              
              <p style={{ color: '#cccccc', fontSize: 'clamp(14px, 3vw, 15px)', marginBottom: 32, lineHeight: 1.6 }}>
                This password reset link is invalid or has expired.
              </p>

              <Link
                to="/forgot-password"
                className="inline-flex items-center justify-center w-full py-3 px-4 rounded-lg font-medium transition-all"
                style={{
                  background: '#333333',
                  color: '#fff',
                  textDecoration: 'none',
                }}
                onMouseEnter={(e) => { e.target.style.background = '#404040'; }}
                onMouseLeave={(e) => { e.target.style.background = '#333333'; }}
              >
                Request a new link
                <ArrowLeft size={16} className="ml-2" />
              </Link>
            </div>
        </div>
      </div>
    );
  }

  if (success) {
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
                <CheckCircle className="text-white" size={24} />
              </div>
              
              <h2
                style={{
                  fontSize: 'clamp(24px, 5vw, 28px)', fontWeight: 800, letterSpacing: '-0.5px',
                  color: '#ffffff', marginBottom: 12,
                }}
              >
                Password Reset!
              </h2>
              
              <p style={{ color: '#cccccc', fontSize: 'clamp(14px, 3vw, 15px)', marginBottom: 32, lineHeight: 1.6 }}>
                Your password has been reset successfully. Redirecting to login...
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
                Go to Login
                <ArrowLeft size={16} className="ml-2" />
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

            <div className="mb-8">
              <h2
                style={{
                  fontSize: 'clamp(24px, 5vw, 28px)', fontWeight: 800, letterSpacing: '-0.5px',
                  color: '#ffffff', marginBottom: 8,
                }}
              >
                Reset password
              </h2>
              <p style={{ color: '#cccccc', fontSize: 'clamp(14px, 3vw, 15px)', lineHeight: 1.5 }}>
                Enter your new password below.
              </p>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* New Password */}
              <div>
                <label
                  style={{
                    display: 'block', fontSize: 14, fontWeight: 600,
                    color: '#ffffff', marginBottom: 8,
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
                      color: errors.newPassword ? '#ff4444' : '#cccccc',
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
                      padding: '14px 46px 14px 42px',
                      borderRadius: 10,
                      border: `1.5px solid ${errors.newPassword ? '#ff4444' : '#333333'}`,
                      background: '#1a1a1a',
                      color: '#ffffff',
                      fontSize: 14,
                      outline: 'none',
                      transition: 'border-color 0.15s',
                      boxSizing: 'border-box',
                    }}
                    onFocus={(e) => { e.target.style.borderColor = '#666666'; e.target.style.background = '#1a1a1a'; }}
                    onBlur={(e) => { e.target.style.borderColor = errors.newPassword ? '#ff4444' : '#333333'; e.target.style.background = '#1a1a1a'; }}
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
                  <p style={{ marginTop: 5, fontSize: 12, color: '#ff4444' }}>{errors.newPassword}</p>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label
                  style={{
                    display: 'block', fontSize: 14, fontWeight: 600,
                    color: '#ffffff', marginBottom: 8,
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
                      color: errors.confirmPassword ? '#ff4444' : '#cccccc',
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
                      padding: '14px 46px 14px 42px',
                      borderRadius: 10,
                      border: `1.5px solid ${errors.confirmPassword ? '#ff4444' : '#333333'}`,
                      background: '#1a1a1a',
                      color: '#ffffff',
                      fontSize: 14,
                      outline: 'none',
                      transition: 'border-color 0.15s',
                      boxSizing: 'border-box',
                    }}
                    onFocus={(e) => { e.target.style.borderColor = '#666666'; e.target.style.background = '#1a1a1a'; }}
                    onBlur={(e) => { e.target.style.borderColor = errors.confirmPassword ? '#ff4444' : '#333333'; e.target.style.background = '#1a1a1a'; }}
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
                  <p style={{ marginTop: 5, fontSize: 12, color: '#ff4444' }}>{errors.confirmPassword}</p>
                )}
              </div>

              {/* Password Requirements */}
              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: 10,
                  background: '#1a1a1a',
                  border: '1.5px solid #333333',
                }}
              >
                <p style={{ fontSize: 12, fontWeight: 600, color: '#ffffff', marginBottom: 8 }}>
                  Password requirements:
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <p style={{ 
                    fontSize: 11, 
                    color: formData.newPassword.length >= 8 ? '#10b981' : '#cccccc',
                    margin: 0,
                  }}>
                    {formData.newPassword.length >= 8 ? '✓' : '·'} At least 8 characters
                  </p>
                  <p style={{ 
                    fontSize: 11, 
                    color: /[A-Z]/.test(formData.newPassword) ? '#10b981' : '#cccccc',
                    margin: 0,
                  }}>
                    {/[A-Z]/.test(formData.newPassword) ? '✓' : '·'} One uppercase letter
                  </p>
                  <p style={{ 
                    fontSize: 11, 
                    color: /[0-9]/.test(formData.newPassword) ? '#10b981' : '#cccccc',
                    margin: 0,
                  }}>
                    {/[0-9]/.test(formData.newPassword) ? '✓' : '·'} One number
                  </p>
                </div>
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

export default ResetPassword;