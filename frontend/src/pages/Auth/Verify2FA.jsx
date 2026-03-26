import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Shield, Smartphone, ArrowRight, Loader, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import authService from '../../services/authService';
import toast from 'react-hot-toast';

const Verify2FA = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { updateUser, completeLogin } = useAuth();
  const userId = location.state?.userId;

  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!userId) {
      navigate('/login');
    }
  }, [userId, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (token.length < 6) return;

    setLoading(true);
    setError('');
    try {
      const res = await authService.verify2FALogin(userId, token);
      if (res?.success) {
        // Complete the login flow via context helper
        completeLogin(res.user, res.token, res.refreshToken);
        
        toast.success(res.message || 'Login successful');
        
        // Wait for state to settle slightly (though navigate should work immediately)
        const userType = res.user.userType || res.user.role;
        
        // Redirect based on user type
        if (userType === 'brand') {
          navigate('/brand/dashboard', { replace: true });
        } else if (userType === 'creator') {
          navigate('/creator/dashboard', { replace: true });
        } else if (userType === 'admin') {
          navigate('/admin/dashboard', { replace: true });
        } else {
          navigate('/', { replace: true });
        }
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid verification code');
      setToken('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600">
            <Shield className="w-8 h-8" />
          </div>
        </div>
        <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">
          Two-Factor Authentication
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          Please enter the 6-digit code from your authenticator app to continue.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="token" className="sr-only">Verification Code</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Smartphone className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="token"
                  name="token"
                  type="text"
                  maxLength={6}
                  required
                  autoFocus
                  className={`appearance-none block w-full pl-10 pr-3 py-3 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-3xl tracking-[1em] text-center font-bold sm:text-2xl ${
                    error ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="000000"
                  value={token}
                  onChange={(e) => setToken(e.target.value.replace(/\D/g, ''))}
                />
              </div>
              {error && (
                <div className="mt-2 flex items-center gap-1 text-sm text-red-600">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || token.length !== 6}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-300 transition-all"
            >
              {loading ? (
                <Loader className="w-5 h-5 animate-spin" />
              ) : (
                <span className="flex items-center">
                  Verify & Login
                  <ArrowRight className="ml-2 w-4 h-4" />
                </span>
              )}
            </button>
          </form>

          <div className="mt-6">
            <button
              onClick={() => navigate('/login')}
              className="w-full text-center text-sm text-gray-500 hover:text-indigo-600 transition-colors"
            >
              Cancel and back to login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Verify2FA;
