import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import ReCAPTCHA from "react-google-recaptcha";
import { Mail, Lock, ArrowRight, Eye, EyeOff, User, Shield, Briefcase, Pen } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import toast from 'react-hot-toast';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const { login, isAuthenticated, user, loading: authLoading } = useAuth();

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY;

  console.log('🔐 reCAPTCHA Site Key loaded:', RECAPTCHA_SITE_KEY ? '✅ Yes' : '❌ No');

  const [loginAttempts, setLoginAttempts] = useState(0);
  const [showCaptcha, setShowCaptcha] = useState(false);
  const [captchaToken, setCaptchaToken] = useState(null);
  const captchaRef = React.useRef();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    userType: 'brand'
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!loading && isAuthenticated && user) {
      console.log('Already logged in, redirecting to dashboard');
      if (user.userType === 'brand') {
        navigate('/brand/dashboard', { replace: true });
      } else if (user.userType === 'creator') {
        navigate('/creator/dashboard', { replace: true });
      } else if (user.userType === 'admin') {
        navigate('/admin/dashboard', { replace: true });
      }
    }
  }, [isAuthenticated, user, loading, navigate]);

  const validate = () => {
    const newErrors = {};
    if (!formData.email) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Invalid email';
    if (!formData.password) newErrors.password = 'Password is required';
    if (!formData.userType) newErrors.userType = 'Select account type';
    if (showCaptcha && !captchaToken) newErrors.captcha = 'Please verify reCAPTCHA';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCaptchaChange = (token) => {
    console.log('🔐 reCAPTCHA token received:', token ? '✅ Yes' : '❌ No');
    setCaptchaToken(token);
    if (errors.captcha) setErrors({ ...errors, captcha: null });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      console.log('🔑 Login attempt:', {
        email: formData.email,
        userType: formData.userType,
        loginAttempts,
        showCaptcha,
        hasCaptcha: !!captchaToken
      });

      const payload = {
        email: formData.email,
        password: formData.password,
        userType: formData.userType
      };

      if (showCaptcha && captchaToken) payload.captchaToken = captchaToken;

      const result = await login(
        payload.email,
        payload.password,
        payload.userType,
        payload.captchaToken || null
      );

      if (result?.require2FA) {
        console.log('⚠️ 2FA required');
        toast('2FA required - please verify your code');
        navigate('/2fa-verify', { state: { userId: result.userId } });
      } else if (result?.success) {
        console.log('✅ Login successful');
        setLoginAttempts(0);
        setShowCaptcha(false);
        setCaptchaToken(null);
      } else {
        const newAttempts = loginAttempts + 1;
        console.log(`❌ Login failed. Attempts: ${newAttempts}`);
        setLoginAttempts(newAttempts);
        if (newAttempts >= 2) {
          console.log('⚠️ Showing CAPTCHA after 2+ failed attempts');
          setShowCaptcha(true);
          toast('Please complete reCAPTCHA to continue');
        }
        if (captchaRef.current) {
          captchaRef.current.reset();
          setCaptchaToken(null);
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      const newAttempts = loginAttempts + 1;
      console.log(`❌ Login error. Attempts: ${newAttempts}`);
      setLoginAttempts(newAttempts);
      if (newAttempts >= 2) {
        console.log('⚠️ Showing CAPTCHA after 2+ attempts');
        setShowCaptcha(true);
        toast.warning('Please complete reCAPTCHA to continue');
      }
      toast.error(error.message || 'Login failed');
      if (captchaRef.current) {
        captchaRef.current.reset();
        setCaptchaToken(null);
      }
    } finally {
      setLoading(false);
    }
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
            Connect brands<br />with creators.
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 17, lineHeight: 1.7, maxWidth: 360 }}>
            The all-in-one platform where brands discover authentic creators and
            creators grow meaningful partnerships.
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
              Welcome back
            </h2>
            <p style={{ color: '#6b7280', fontSize: 15 }}>
              Sign in to your account to continue
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* ── Account type selector ── */}
            <div>
              <label
                style={{
                  display: 'block', fontSize: 11, fontWeight: 700,
                  letterSpacing: '0.08em', textTransform: 'uppercase',
                  color: '#9ca3af', marginBottom: 10,
                }}
              >
                Sign in as
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {/* Brand */}
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, userType: 'brand' })}
                  style={{
                    padding: '14px 12px',
                    borderRadius: 12,
                    border: formData.userType === 'brand'
                      ? '2px solid #667eea'
                      : '2px solid #e5e7eb',
                    background: formData.userType === 'brand'
                      ? '#f5f3ff'
                      : '#fff',
                    cursor: 'pointer',
                    transition: 'all 0.18s ease',
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', gap: 8,
                  }}
                >
                  <div
                    style={{
                      width: 38, height: 38, borderRadius: 10,
                      background: formData.userType === 'brand'
                        ? 'linear-gradient(135deg,#667eea,#764ba2)'
                        : '#f3f4f6',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.18s ease',
                    }}
                  >
                    <Briefcase
                      size={18}
                      style={{ color: formData.userType === 'brand' ? '#fff' : '#6b7280' }}
                    />
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <p
                      style={{
                        fontSize: 14, fontWeight: 600,
                        color: formData.userType === 'brand'
                          ? '#667eea'
                          : '#374151',
                      }}
                    >
                      Brand
                    </p>
                    <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>
                      Run campaigns
                    </p>
                  </div>
                </button>

                {/* Creator */}
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, userType: 'creator' })}
                  style={{
                    padding: '14px 12px',
                    borderRadius: 12,
                    border: formData.userType === 'creator'
                      ? '2px solid #667eea'
                      : '2px solid #e5e7eb',
                    background: formData.userType === 'creator'
                      ? '#f5f3ff'
                      : '#fff',
                    cursor: 'pointer',
                    transition: 'all 0.18s ease',
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', gap: 8,
                  }}
                >
                  <div
                    style={{
                      width: 38, height: 38, borderRadius: 10,
                      background: formData.userType === 'creator'
                        ? 'linear-gradient(135deg,#667eea,#764ba2)'
                        : '#f3f4f6',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.18s ease',
                    }}
                  >
                    <Pen
                      size={18}
                      style={{ color: formData.userType === 'creator' ? '#fff' : '#6b7280' }}
                    />
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <p
                      style={{
                        fontSize: 14, fontWeight: 600,
                        color: formData.userType === 'creator'
                          ? '#667eea'
                          : '#374151',
                      }}
                    >
                      Creator
                    </p>
                    <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>
                      Grow & earn
                    </p>
                  </div>
                </button>
              </div>

              {errors.userType && (
                <p style={{ marginTop: 6, fontSize: 12, color: '#ef4444' }}>{errors.userType}</p>
              )}
            </div>

            {/* ── Email ── */}
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
                  onFocus={(e) => { e.target.style.borderColor = '#667eea'; e.target.style.background = '#fff'; }}
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
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  style={{
                    fontSize: 12, fontWeight: 600,
                    color: '#667eea', textDecoration: 'none',
                  }}
                >
                  Forgot password?
                </Link>
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
                  placeholder="Enter your password"
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
                  onFocus={(e) => { e.target.style.borderColor = '#667eea'; e.target.style.background = '#fff'; }}
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

            {/* ── Smart CAPTCHA ── */}
            {showCaptcha && RECAPTCHA_SITE_KEY && (
              <div
                style={{
                  padding: '14px 16px',
                  borderRadius: 10,
                  border: `1.5px solid ${errors.captcha ? '#ef4444' : '#f59e0b'}`,
                  background: '#fffbeb',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <Shield size={15} style={{ color: '#f59e0b' }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#92400e' }}>
                    Security verification required
                  </span>
                </div>
                <ReCAPTCHA ref={captchaRef} sitekey={RECAPTCHA_SITE_KEY} onChange={handleCaptchaChange} />
                {errors.captcha && (
                  <p style={{ marginTop: 8, fontSize: 12, color: '#ef4444' }}>{errors.captcha}</p>
                )}
                <p style={{ marginTop: 8, fontSize: 11, color: '#78716c' }}>
                  Multiple login attempts detected. Please verify you're not a robot.
                </p>
              </div>
            )}

            {/* ── Dev attempt counter ── */}
            {import.meta.env.MODE === 'development' && loginAttempts > 0 && (
              <div
                style={{
                  padding: '8px 12px', borderRadius: 8, textAlign: 'center',
                  fontSize: 11, background: '#f3f4f6',
                  color: '#6b7280',
                }}
              >
                🔍 Login attempts: {loginAttempts}
              </div>
            )}

            {/* ── Submit ── */}
            <button
              type="submit"
              disabled={loading || authLoading || (showCaptcha && !captchaToken)}
              style={{
                width: '100%',
                padding: '13px 20px',
                borderRadius: 10,
                border: 'none',
                background: (loading || authLoading || (showCaptcha && !captchaToken))
                  ? '#a5b4fc'
                  : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: '#fff',
                fontSize: 15,
                fontWeight: 700,
                cursor: (loading || authLoading || (showCaptcha && !captchaToken)) ? 'not-allowed' : 'pointer',
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
                  Sign In
                  <ArrowRight size={17} />
                </>
              )}
            </button>

            {/* ── Footer links ── */}
            <p style={{ textAlign: 'center', fontSize: 14, color: '#6b7280' }}>
              Don't have an account?{' '}
              <Link
                to="/signup"
                style={{ fontWeight: 700, color: '#667eea', textDecoration: 'none' }}
              >
                Create account
              </Link>
            </p>

            <div style={{ textAlign: 'center' }}>
              <Link
                to="/admin/login"
                style={{
                  fontSize: 12, color: '#9ca3af',
                  textDecoration: 'none', transition: 'color 0.15s',
                }}
                onMouseEnter={(e) => { e.target.style.color = '#6b7280'; }}
                onMouseLeave={(e) => { e.target.style.color = '#9ca3af'; }}
              >
                Admin Login →
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
                Your information is secure and encrypted
              </span>
            </div>

          </form>
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

export default Login;