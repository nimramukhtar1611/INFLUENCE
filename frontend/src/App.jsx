// App.js (Complete)
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { SocketProvider } from './context/SocketContext';
import { NotificationProvider } from './context/NotificationContext';
import { CampaignProvider } from './context/CampaignContext';
import { DealProvider } from './context/DealContext';
import { MessageProvider } from './context/MessageContext';
import { PaymentProvider } from './context/PaymentContext';
import { SearchProvider } from './context/SearchContext';
import { SubscriptionProvider } from './context/SubscriptionContext';

// Layout Components
import Layout from './components/Layout/Layout';
import ProtectedRoute from './components/Auth/ProtectedRoute';

// Public Pages
import Home from './pages/Home';
import Login from './pages/Auth/Login';
import Signup from './pages/Auth/Signup';
import ForgotPassword from './pages/Auth/ForgotPassword';
import ResetPassword from './pages/Auth/ResetPassword';
import VerifyEmail from './pages/Auth/VerifyEmail';
import Verify2FA from './pages/Auth/Verify2FA';
import NotFound from './pages/NotFound';

// Brand Pages
import BrandDashboard from './pages/Brand/Dashboard';
import BrandCampaigns from './pages/Brand/CampaignList';
import BrandCreatorProfile from './pages/Brand/CreatorProfile'
import BrandCampaignBuilder from './pages/Brand/CampaignBuilder';
import BrandCampaignDetails from './pages/Brand/CampaignDetails';
import BrandSearchCreators from './pages/Brand/SearchCreators';
import BrandDeals from './pages/Brand/Deals';
import BrandCampaignEdit from './pages/Brand/CampaignEdit'
import CreateDeal from './pages/Brand/CreateDeal';
import BrandDealDetails from './pages/Brand/DealDetails';
import BrandAnalytics from './pages/Brand/Analytics';
import BrandPayments from './pages/Brand/Payments';
import BrandProfile from './pages/Brand/Profile';
import BrandSettings from './pages/Brand/Settings';
import BrandInbox from './pages/Brand/Inbox';

// Creator Pages
import CreatorDashboard from './pages/Creator/Dashboard';
import CreatorAvailableDeals from './pages/Creator/AvailableDeals';
import CreatorDeals from './pages/Creator/Deals';
import CreatorDealDetails from './pages/Creator/DealDetails';
import CreatorDeliverables from './pages/Creator/Deliverables';
import CreatorAnalytics from './pages/Creator/Analytics';
import CreatorEarnings from './pages/Creator/Earnings';
import CreatorWithdrawals from './pages/Creator/Withdrawals';
import CreatorProfile from './pages/Creator/Profile';
import CreatorSettings from './pages/Creator/Settings';
import CreatorInbox from './pages/Creator/Inbox';

// Admin Pages
import AdminDashboard from './pages/Admin/Dashboard';
import AdminUsers from './pages/Admin/Users';
import AdminBrands from './pages/Admin/Brands';
import AdminCreators from './pages/Admin/Creators';
import AdminCampaigns from './pages/Admin/Campaigns';
import AdminDeals from './pages/Admin/Deals';
import AdminPayments from './pages/Admin/Payments';
import AdminReports from './pages/Admin/Reports';
import AdminDisputes from './pages/Admin/Disputes';
import AdminSettings from './pages/Admin/Settings';
import AdminLogin from './pages/Admin/AdminLogin';
// Common Pages
import Notifications from './components/Common/Notifications';
import Disputes from './components/Common/Disputes';
import HelpCenter from './components/Common/HelpCenter';
import Contracts from './components/Common/Contracts';
import Pricing from './pages/Pricing';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';
import SubscriptionManager from './pages/Common/SubscriptionManager';

function App() {
  const isCypressRun = typeof window !== 'undefined' && Boolean(window.Cypress);

  return (
    <AuthProvider>
      <ThemeProvider>
        <SocketProvider>            
          <NotificationProvider>     
            <CampaignProvider>
              <DealProvider>
                <MessageProvider>
                  <PaymentProvider>
                    <SubscriptionProvider>
                    <SearchProvider>
                        {!isCypressRun && (
                          <Toaster
                            position="top-right"
                            toastOptions={{
                              duration: 4000,
                              style: {
                                background: '#363636',
                                color: '#fff',
                              },
                              success: {
                                duration: 3000,
                                iconTheme: {
                                  primary: '#10b981',
                                  secondary: '#fff',
                                },
                              },
                              error: {
                                duration: 4000,
                                iconTheme: {
                                  primary: '#ef4444',
                                  secondary: '#fff',
                                },
                              },
                            }}
                          />
                        )}

                        <Routes>
                          {/* Public Routes */}
                          <Route path="/" element={<Home />} />
                          <Route path="/login" element={<Login />} />
                          <Route path="/signup" element={<Signup />} />
                          <Route path="/forgot-password" element={<ForgotPassword />} />
                          <Route path="/reset-password" element={<ResetPassword />} />
                          <Route path="/verify-email" element={<VerifyEmail />} />
                          <Route path="/2fa-verify" element={<Verify2FA />} />
                          <Route path="/pricing" element={<Pricing />} />
                          <Route path="/terms" element={<Terms />} />
                          <Route path="/privacy" element={<Privacy />} />
                         <Route path="/admin/login" element={<AdminLogin />} />

                          {/* Brand Routes */}
                          <Route path="/brand" element={
                            <ProtectedRoute allowedRoles={['brand']}>
                              <Layout />
                            </ProtectedRoute>
                          }>
                            <Route index element={<Navigate to="dashboard" replace />} />
                            <Route path="dashboard" element={<BrandDashboard />} />
                            <Route path="campaigns" element={<BrandCampaigns />} />
                            <Route path="campaigns/new" element={<BrandCampaignBuilder />} />
                            <Route path="campaigns/:id" element={<BrandCampaignDetails />} />
                            <Route path="search" element={<BrandSearchCreators />} />
                            <Route path="deals" element={<BrandDeals />} />
                            <Route path="deals/:id" element={<BrandDealDetails />} />
                            <Route path="creators/:id" element={<BrandCreatorProfile />} />
                            <Route path="analytics" element={<BrandAnalytics />} />
                            <Route path="payments" element={<BrandPayments />} />
                            <Route path="createdeal" element={<CreateDeal />} />
                            <Route path="profile" element={<BrandProfile />} />
                            <Route path="settings" element={<BrandSettings />} />
                            <Route path="subscription" element={<SubscriptionManager />} />
                             <Route path="campaigns/:id/edit" element={<BrandCampaignEdit />} />
                            <Route path="inbox" element={<BrandInbox />} />
                            <Route path="notifications" element={<Notifications />} />
                            <Route path="disputes" element={<Disputes />} />
                            <Route path="contracts" element={<Contracts />} />
                          </Route>

                          {/* Creator Routes */}
                          <Route path="/creator" element={
                            <ProtectedRoute allowedRoles={['creator']}>
                              <Layout />
                            </ProtectedRoute>
                          }>
                            <Route index element={<Navigate to="dashboard" replace />} />
                            <Route path="dashboard" element={<CreatorDashboard />} />
                            <Route path="available-deals" element={<CreatorAvailableDeals />} />
                            <Route path="deals" element={<CreatorDeals />} />
                            <Route path="deals/:id" element={<CreatorDealDetails />} />
                            <Route path="deliverables/:dealId" element={<CreatorDeliverables />} />
                            <Route path="analytics" element={<CreatorAnalytics />} />
                            <Route path="earnings" element={<CreatorEarnings />} />
                            <Route path="withdrawals" element={<CreatorWithdrawals />} />
                            <Route path="profile" element={<CreatorProfile />} />
                            <Route path="settings" element={<CreatorSettings />} />
                            <Route path="subscription" element={<SubscriptionManager />} />
                            <Route path="inbox" element={<CreatorInbox />} />
                            <Route path="notifications" element={<Notifications />} />
                            <Route path="disputes" element={<Disputes />} />
                            <Route path="contracts" element={<Contracts />} />
                          </Route>

                          {/* Admin Routes */}

<Route path="/admin" element={
  <ProtectedRoute allowedRoles={['admin', 'super_admin']}>
    <Layout />
  </ProtectedRoute>
}>
  <Route index element={<Navigate to="dashboard" replace />} />
  <Route path="dashboard" element={<AdminDashboard />} />
  <Route path="users" element={<AdminUsers />} />
  <Route path="brands" element={<AdminBrands />} />
  <Route path="creators" element={<AdminCreators />} />
  <Route path="campaigns" element={<AdminCampaigns />} />
  <Route path="deals" element={<AdminDeals />} />
  <Route path="payments" element={<AdminPayments />} />
  <Route path="reports" element={<AdminReports />} />
  <Route path="settings" element={<AdminSettings />} />
  <Route path="disputes" element={<AdminDisputes />} />
  <Route path="notifications" element={<Notifications />} />
</Route>

                          {/* 404 */}
                          <Route path="*" element={<NotFound />} />
                        </Routes>
                     </SearchProvider>
                    </SubscriptionProvider>
                  </PaymentProvider>
                </MessageProvider>
              </DealProvider>
            </CampaignProvider>
          </NotificationProvider>
        </SocketProvider>
      </ThemeProvider>
      </AuthProvider>
  );
}

export default App;