// services/authService.js - COMPLETE FIXED VERSION
import api from './api';

class AuthService {
  
  // ==================== REGISTER ====================
  async register(userData) {
    try {
      console.log('Registering user:', userData);
      const response = await api.post('/auth/register', userData);
      return response;
    } catch (error) {
      console.error('Register error:', error);
      throw error;
    }
  }

  // ==================== LOGIN ====================
  async login(email, password, userType) {
    try {
      console.log('Logging in:', { email, userType });
      const response = await api.post('/auth/login', {
        email,
        password,
        userType
      });
      
      if (response?.success) {
        // Store user data
        if (response.user) {
          localStorage.setItem('user', JSON.stringify(response.user));
        }
      }
      
      return response;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  // ==================== LOGOUT ====================
  async logout(refreshToken) {
    try {
      const response = await api.post('/auth/logout', { refreshToken });
      
      // Clear local storage
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      
      return response;
    } catch (error) {
      console.error('Logout error:', error);
      // Still clear local storage even if API fails
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      throw error;
    }
  }

  // ==================== GET CURRENT USER ====================
  async getCurrentUser() {
    try {
      const response = await api.get('/auth/me');
      return response;
    } catch (error) {
      console.error('Get current user error:', error);
      throw error;
    }
  }

  // ==================== REFRESH TOKEN ====================
  async refreshToken(refreshToken) {
    try {
      const response = await api.post('/auth/refresh-token', { refreshToken });
      return response;
    } catch (error) {
      console.error('Refresh token error:', error);
      throw error;
    }
  }

  // ==================== CHANGE PASSWORD ====================
  async changePassword(currentPassword, newPassword) {
    try {
      const response = await api.post('/auth/change-password', {
        currentPassword,
        newPassword
      });
      return response;
    } catch (error) {
      console.error('Change password error:', error);
      throw error;
    }
  }

  // ==================== FORGOT PASSWORD ====================
  async forgotPassword(email) {
    try {
      const response = await api.post('/auth/forgot-password', { email });
      return response;
    } catch (error) {
      console.error('Forgot password error:', error);
      throw error;
    }
  }

  // ==================== RESET PASSWORD ====================
  async resetPassword(token, newPassword) {
    try {
      const response = await api.post('/auth/reset-password', {
        token,
        newPassword
      });
      return response;
    } catch (error) {
      console.error('Reset password error:', error);
      throw error;
    }
  }

  // ==================== VERIFY EMAIL ====================
  async verifyEmail(token) {
    try {
      const response = await api.post('/auth/verify-email', { token });
      return response;
    } catch (error) {
      console.error('Verify email error:', error);
      throw error;
    }
  }

  // ==================== SEND EMAIL OTP ====================
  async sendEmailOTP(email) {
    try {
      console.log('Sending email OTP to:', email);
      const response = await api.post('/auth/send-otp', { email });
      return response;
    } catch (error) {
      console.error('Send email OTP error:', error);
      throw error;
    }
  }

  // ==================== VERIFY EMAIL OTP ====================
  async verifyEmailOTP(email, otp) {
    try {
      console.log('Verifying email OTP:', { email, otp });
      const response = await api.post('/auth/verify-otp', { email, otp });
      return response;
    } catch (error) {
      console.error('Verify email OTP error:', error);
      throw error;
    }
  }

  // ==================== SEND PHONE OTP ====================
  async sendPhoneOTP(phone) {
    try {
      console.log('Sending phone OTP to:', phone);
      const response = await api.post('/auth/send-phone-otp', { phone });
      return response;
    } catch (error) {
      console.error('Send phone OTP error:', error);
      throw error;
    }
  }

  // ==================== VERIFY PHONE OTP ====================
  async verifyPhoneOTP(phone, otp) {
    try {
      console.log('Verifying phone OTP:', { phone, otp });
      const response = await api.post('/auth/verify-phone-otp', { phone, otp });
      return response;
    } catch (error) {
      console.error('Verify phone OTP error:', error);
      throw error;
    }
  }

  // ==================== SETUP 2FA ====================
  async setup2FA() {
    try {
      const response = await api.post('/auth/2fa/setup');
      return response;
    } catch (error) {
      console.error('Setup 2FA error:', error);
      throw error;
    }
  }

  // ==================== VERIFY 2FA ====================
  async verify2FA(token) {
    try {
      const response = await api.post('/auth/2fa/verify', { token });
      return response;
    } catch (error) {
      console.error('Verify 2FA error:', error);
      throw error;
    }
  }

  // ==================== DISABLE 2FA ====================
  async disable2FA() {
    try {
      const response = await api.post('/auth/2fa/disable');
      return response;
    } catch (error) {
      console.error('Disable 2FA error:', error);
      throw error;
    }
  }

  // ==================== SOCIAL LOGIN ====================
  async socialLogin(provider, token) {
    try {
      const response = await api.post(`/auth/social/${provider}`, { token });
      
      if (response?.success && response.user) {
        localStorage.setItem('user', JSON.stringify(response.user));
      }
      
      return response;
    } catch (error) {
      console.error(`${provider} login error:`, error);
      throw error;
    }
  }

  // ==================== UPDATE PROFILE ====================
  async updateProfile(profileData) {
    try {
      const endpoint = profileData.userType === 'brand' 
        ? '/brands/profile' 
        : '/creators/profile';
      
      const response = await api.put(endpoint, profileData);
      
      if (response?.success && (response.brand || response.creator)) {
        // Update stored user
        const user = response.brand || response.creator;
        localStorage.setItem('user', JSON.stringify(user));
      }
      
      return response;
    } catch (error) {
      console.error('Update profile error:', error);
      throw error;
    }
  }

  // ==================== UPLOAD PROFILE PICTURE ====================
  async uploadProfilePicture(file, onProgress) {
    try {
      const response = await api.upload('/upload/profile-picture', file, onProgress);
      return response;
    } catch (error) {
      console.error('Upload profile picture error:', error);
      throw error;
    }
  }

  // ==================== UPLOAD COVER PHOTO ====================
  async uploadCoverPhoto(file, onProgress) {
    try {
      const response = await api.upload('/upload/cover-photo', file, onProgress);
      return response;
    } catch (error) {
      console.error('Upload cover photo error:', error);
      throw error;
    }
  }

  // ==================== DEACTIVATE ACCOUNT ====================
  async deactivateAccount(password) {
    try {
      const response = await api.post('/auth/deactivate', { password });
      
      // Clear local storage on success
      if (response?.success) {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
      }
      
      return response;
    } catch (error) {
      console.error('Deactivate account error:', error);
      throw error;
    }
  }

  // ==================== DELETE ACCOUNT ====================
  async deleteAccount(password) {
    try {
      const response = await api.delete('/auth/account', { data: { password } });
      
      // Clear local storage on success
      if (response?.success) {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
      }
      
      return response;
    } catch (error) {
      console.error('Delete account error:', error);
      throw error;
    }
  }

  // ==================== GET SESSIONS ====================
  async getSessions() {
    try {
      const response = await api.get('/auth/sessions');
      return response;
    } catch (error) {
      console.error('Get sessions error:', error);
      throw error;
    }
  }

  // ==================== REVOKE SESSION ====================
  async revokeSession(sessionId) {
    try {
      const response = await api.delete(`/auth/sessions/${sessionId}`);
      return response;
    } catch (error) {
      console.error('Revoke session error:', error);
      throw error;
    }
  }
}

export default new AuthService();