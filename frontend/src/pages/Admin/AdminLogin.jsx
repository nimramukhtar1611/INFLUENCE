// AdminLogin.jsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, ArrowRight, Eye, EyeOff, Shield, Settings, Database, BarChart } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const AdminLogin = () => {
  const { loginAdmin, isAuthenticated, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Check if already authenticated as admin
    const role = user?.userType || user?.role;
    const isAdmin = role === 'admin' || role === 'super_admin';

    if (!authLoading && isAuthenticated && isAdmin) {
      console.log('Admin already authenticated, redirecting to dashboard');
      navigate('/admin/dashboard', { replace: true });
    }
  }, [isAuthenticated, user, authLoading, navigate]);

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [show2FA, setShow2FA] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});

  const validate = () => {
    const newErrors = {};
    if (!formData.email) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Invalid email';
    if (!formData.password) newErrors.password = 'Password is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);

    const result = await loginAdmin(formData.email, formData.password);
    
    if (result?.require2FA) {
      setShow2FA(true);
    } else if (result?.success) {
      // Navigation will be handled by the useEffect above
      console.log('Login successful, waiting for redirect...');
      toast.success('Admin login successful!');
    }
    setLoading(false);
  };

  const handle2FASubmit = async (e) => {
    e.preventDefault();
    if (twoFactorCode.length !== 6) {
      toast.error('Enter a valid 6-digit code');
      return;
    }
    setLoading(true);

    const result = await loginAdmin(formData.email, formData.password, twoFactorCode);
    if (result?.success) {
      // Navigation will be handled by the useEffect above
      console.log('2FA verification successful, waiting for redirect...');
      toast.success('2FA verification successful!');
    }
    setLoading(false);
  };

  return (
    <div
      className="min-h-screen flex"
      style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      }}
    >
      {/* ── Left decorative panel ── */}
      <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-12 overflow-hidden">
        {/* floating blobs */}
        <div
          style={{
            position: 'absolute', width: 340, height: 340, borderRadius: '50%',
            background: 'rgba(255,255,255,0.05)', top: -80, left: -80,
          }}
        />
        <div
          style={{
            position: 'absolute', width: 220, height: 220, borderRadius: '50%',
            background: 'rgba(255,255,255,0.03)', bottom: 80, right: -40,
          }}
        />
        <div
          style={{
            position: 'absolute', width: 140, height: 140, borderRadius: '50%',
            background: 'rgba(255,255,255,0.07)', top: '45%', left: '60%',
          }}
        />

        {/* brand mark */}
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div
              style={{
                width: 44, height: 44, borderRadius: 12,
                background: 'rgba(255,255,255,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                backdropFilter: 'blur(8px)',
              }}
            >
              <Settings className="text-white" size={22} />
            </div>
            <span style={{ color: '#fff', fontSize: 22, fontWeight: 700, letterSpacing: '-0.5px' }}>
              InfluenceX Admin
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
            Admin Control<br />Center.
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 17, lineHeight: 1.7, maxWidth: 360 }}>
            Complete administrative control over the InfluenceX platform.
            Manage users, monitor analytics, and ensure system integrity.
          </p>

          {/* admin features */}
          <div className="space-y-4 mt-10">
            {[
              { icon: Database, text: 'Database Management' },
              { icon: BarChart, text: 'Analytics & Reports' },
              { icon: Shield, text: 'Security & Compliance' },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div
                  style={{
                    width: 32, height: 32, borderRadius: 8,
                    background: 'rgba(255,255,255,0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <Icon className="text-white" size={16} />
                </div>
                <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: 14 }}>
                  {text}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* bottom tag */}
        <div
          className="relative z-10 flex items-center gap-2"
          style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}
        >
          <Shield size={13} />
          <span>Secure administrative access</span>
        </div>
      </div>

      {/* ── Right form panel ── */}
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
                background: 'linear-gradient(135deg,#1e293b,#475569)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Settings className="text-white" size={18} />
            </div>
            <span
              style={{
                fontSize: 18, fontWeight: 700,
                color: '#111827',
              }}
            >
              Admin Panel
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
              Admin Sign In
            </h2>
            <p style={{ color: '#6b7280', fontSize: 15 }}>
              Enter your admin credentials to access the control panel
            </p>
          </div>

          {!show2FA ? (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* ── Email ── */}
              <div>
                <label
                  style={{
                    display: 'block', fontSize: 13, fontWeight: 600,
                    color: '#374151', marginBottom: 6,
                  }}
                >
                  Admin email address
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
                    placeholder="admin@influencex.com"
                    value={formData.email}
                    onChange={(e) => {
                      setFormData({ ...formData, email: e.target.value });
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
                    onFocus={(e) => { e.target.style.borderColor = '#1e293b'; e.target.style.background = '#fff'; }}
                    onBlur={(e) => { e.target.style.borderColor = errors.email ? '#ef4444' : '#e5e7eb'; e.target.style.background = '#f9fafb'; }}
                  />
                </div>
                {errors.email && (
                  <p style={{ marginTop: 5, fontSize: 12, color: '#ef4444' }}>{errors.email}</p>
                )}
              </div>

              {/* ── Password ── */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label
                    style={{
                      fontSize: 13, fontWeight: 600,
                      color: '#374151',
                    }}
                  >
                    Admin password
                  </label>
                </div>

                <div style={{ position: 'relative' }}>
                  <Lock
                    size={16}
                    style={{
                      position: 'absolute', left: 14, top: '50%',
                      transform: 'translateY(-50%)',
                      color: errors.password ? '#ef4444' : '#9ca3af',
                    }}
                  />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter admin password"
                    value={formData.password}
                    onChange={(e) => {
                      setFormData({ ...formData, password: e.target.value });
                      if (errors.password) setErrors({ ...errors, password: null });
                    }}
                    style={{
                      width: '100%',
                      padding: '12px 44px 12px 40px',
                      borderRadius: 10,
                      border: `1.5px solid ${errors.password ? '#ef4444' : '#e5e7eb'}`,
                      background: '#f9fafb',
                      color: '#111827',
                      fontSize: 14,
                      outline: 'none',
                      transition: 'border-color 0.15s',
                      boxSizing: 'border-box',
                    }}
                    onFocus={(e) => { e.target.style.borderColor = '#1e293b'; e.target.style.background = '#fff'; }}
                    onBlur={(e) => { e.target.style.borderColor = errors.password ? '#ef4444' : '#e5e7eb'; e.target.style.background = '#f9fafb'; }}
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

                {errors.password && (
                  <p style={{ marginTop: 5, fontSize: 12, color: '#ef4444' }}>{errors.password}</p>
                )}
              </div>

              {/* ── Submit ── */}
              <button
                type="submit"
                disabled={loading || authLoading}
                style={{
                  width: '100%',
                  padding: '13px 20px',
                  borderRadius: 10,
                  border: 'none',
                  background: (loading || authLoading)
                    ? '#a5b4fc'
                  : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: '#fff',
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: (loading || authLoading) ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  transition: 'opacity 0.2s, transform 0.1s',
                  letterSpacing: '0.01em',
                }}
                onMouseEnter={(e) => { if (!loading && !authLoading) e.target.style.opacity = '0.92'; }}
                onMouseLeave={(e) => { e.target.style.opacity = '1'; }}
              >
                {loading || authLoading ? (
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
                    Sign In as Admin
                    <ArrowRight size={17} />
                  </>
                )}
              </button>

              {/* ── Footer links ── */}
              <div style={{ textAlign: 'center' }}>
                <Link
                  to="/login"
                  style={{
                    fontSize: 12, color: '#9ca3af',
                    textDecoration: 'none', transition: 'color 0.15s',
                  }}
                  onMouseEnter={(e) => { e.target.style.color = '#6b7280'; }}
                  onMouseLeave={(e) => { e.target.style.color = '#9ca3af'; }}
                >
                  ← Back to User Login
                </Link>
              </div>

              <div
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  gap: 6, paddingTop: 4,
                }}
              >
                <Shield size={11} style={{ color: '#d1d5db' }} />
                <span style={{ fontSize: 11, color: '#9ca3af' }}>
                  Administrative access is monitored and logged
                </span>
              </div>

            </form>
          ) : (
            <form onSubmit={handle2FASubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div
                style={{
                  padding: '16px 20px',
                  borderRadius: 10,
                  border: '1.5px solid #3b82f6',
                  background: '#eff6ff',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <Shield size={15} style={{ color: '#3b82f6' }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#1e40af' }}>
                    2FA Verification Required
                  </span>
                </div>
                <p style={{ fontSize: 12, color: '#64748b', lineHeight: 1.5 }}>
                  Enter the 6-digit code from your authenticator app to complete admin authentication.
                </p>
              </div>

              <div>
                <label
                  style={{
                    display: 'block', fontSize: 13, fontWeight: 600,
                    color: '#374151', marginBottom: 6,
                  }}
                >
                  Authentication Code
                </label>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="000000"
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, ''))}
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: 10,
                    border: '1.5px solid #e5e7eb',
                    background: '#f9fafb',
                    color: '#111827',
                    fontSize: 20,
                    fontWeight: 600,
                    textAlign: 'center',
                    letterSpacing: '0.1em',
                    outline: 'none',
                    transition: 'border-color 0.15s',
                    boxSizing: 'border-box',
                  }}
                  onFocus={(e) => { e.target.style.borderColor = '#1e293b'; e.target.style.background = '#fff'; }}
                  onBlur={(e) => { e.target.style.borderColor = '#e5e7eb'; e.target.style.background = '#f9fafb'; }}
                />
              </div>

              <button
                type="submit"
                disabled={loading || authLoading || twoFactorCode.length !== 6}
                style={{
                  width: '100%',
                  padding: '13px 20px',
                  borderRadius: 10,
                  border: 'none',
                  background: (loading || authLoading || twoFactorCode.length !== 6)
                    ? '#a5b4fc'
                  : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: '#fff',
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: (loading || authLoading || twoFactorCode.length !== 6) ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  transition: 'opacity 0.2s, transform 0.1s',
                  letterSpacing: '0.01em',
                }}
                onMouseEnter={(e) => { if (!loading && !authLoading && twoFactorCode.length === 6) e.target.style.opacity = '0.92'; }}
                onMouseLeave={(e) => { e.target.style.opacity = '1'; }}
              >
                {loading || authLoading ? (
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
                    Verify & Login
                    <ArrowRight size={17} />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setShow2FA(false);
                  setTwoFactorCode('');
                }}
                style={{
                  padding: '10px',
                  background: 'none',
                  border: 'none',
                  color: '#6b7280',
                  fontSize: 13,
                  cursor: 'pointer',
                  transition: 'color 0.15s',
                }}
                onMouseEnter={(e) => { e.target.style.color = '#374151'; }}
                onMouseLeave={(e) => { e.target.style.color = '#6b7280'; }}
              >
                ← Back to Login
              </button>
            </form>
          )}
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

export default AdminLogin;