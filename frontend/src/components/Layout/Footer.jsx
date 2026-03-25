// components/Layout/Footer.js - COMPLETE FIXED VERSION
import React from 'react';
import { Link } from 'react-router-dom';
import {
  Facebook,
  Twitter,
  Instagram,
  Linkedin,
  Youtube,
  Mail,
  Phone,
  MapPin,
  Github,
  Globe,
  Heart,
  Award,
  Shield,
  FileText,
  HelpCircle,
  Briefcase,
  Users,
  Star,
  TrendingUp,
  DollarSign,
  Camera,
  Music,
  Gamepad2,
  Coffee,
  BookOpen
} from 'lucide-react';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  // ==================== FOOTER LINKS ====================
  const footerLinks = {
    company: {
      title: 'Company',
      links: [
        { label: 'About Us', to: '/about', icon: Award },
        { label: 'Careers', to: '/careers', icon: Briefcase },
        { label: 'Blog', to: '/blog', icon: BookOpen },
        { label: 'Press', to: '/press', icon: Camera },
        { label: 'Contact', to: '/contact', icon: Mail }
      ]
    },
    platform: {
      title: 'Platform',
      links: [
        { label: 'How It Works', to: '/how-it-works', icon: Globe },
        { label: 'Pricing', to: '/pricing', icon: DollarSign },
        { label: 'For Brands', to: '/brands', icon: TrendingUp },
        { label: 'For Creators', to: '/creators', icon: Star },
        { label: 'Success Stories', to: '/success-stories', icon: Heart }
      ]
    },
    resources: {
      title: 'Resources',
      links: [
        { label: 'Help Center', to: '/help', icon: HelpCircle },
        { label: 'Community', to: '/community', icon: Users },
        { label: 'Creator Guide', to: '/creator-guide', icon: Camera },
        { label: 'Brand Guide', to: '/brand-guide', icon: TrendingUp },
        { label: 'API Documentation', to: '/docs', icon: FileText }
      ]
    },
    legal: {
      title: 'Legal',
      links: [
        { label: 'Terms of Service', to: '/terms', icon: FileText },
        { label: 'Privacy Policy', to: '/privacy', icon: Shield },
        { label: 'Cookie Policy', to: '/cookies', icon: Coffee },
        { label: 'GDPR Compliance', to: '/gdpr', icon: Shield },
        { label: 'Security', to: '/security', icon: Shield }
      ]
    }
  };

  // ==================== SOCIAL LINKS ====================
  const socialLinks = [
    { icon: Facebook, href: 'https://facebook.com/influencex', label: 'Facebook', color: 'hover:text-blue-600' },
    { icon: Twitter, href: 'https://twitter.com/influencex', label: 'Twitter', color: 'hover:text-blue-400' },
    { icon: Instagram, href: 'https://instagram.com/influencex', label: 'Instagram', color: 'hover:text-pink-600' },
    { icon: Linkedin, href: 'https://linkedin.com/company/influencex', label: 'LinkedIn', color: 'hover:text-blue-700' },
    { icon: Youtube, href: 'https://youtube.com/@influencex', label: 'YouTube', color: 'hover:text-red-600' },
    { icon: Github, href: 'https://github.com/influencex', label: 'GitHub', color: 'hover:text-gray-900' }
  ];

  // ==================== CONTACT INFO ====================
  const contactInfo = [
    { icon: Mail, text: 'support@influencex.com', href: 'mailto:support@influencex.com' },
    { icon: Phone, text: '+1 (555) 123-4567', href: 'tel:+15551234567' },
    { icon: MapPin, text: 'San Francisco, CA', href: 'https://maps.google.com/?q=San+Francisco+CA' }
  ];

  // ==================== APP STORE LINKS ====================
  const appLinks = [
    {
      name: 'App Store',
      icon: '/icons/app-store.svg',
      href: 'https://apps.apple.com/app/influencex',
      fallback: 'https://apps.apple.com'
    },
    {
      name: 'Google Play',
      icon: '/icons/google-play.svg',
      href: 'https://play.google.com/store/apps/details?id=com.influencex',
      fallback: 'https://play.google.com'
    }
  ];

  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Main Footer Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 mb-12">
          {/* Company Info */}
          <div className="lg:col-span-1">
            <Link to="/" className="flex items-center space-x-2 mb-6">
              <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-xl">IX</span>
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                InfluenceX
              </span>
            </Link>
            
            <p className="text-gray-400 mb-6 max-w-md">
              The trusted marketplace connecting brands with authentic micro-creators. 
              Empowering authentic collaborations since 2024.
            </p>

            {/* Social Links */}
            <div className="flex space-x-4 mb-6">
              {socialLinks.map((social, index) => {
                const Icon = social.icon;
                return (
                  <a
                    key={index}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-gray-700 transition-colors ${social.color}`}
                    aria-label={social.label}
                  >
                    <Icon className="w-5 h-5" />
                  </a>
                );
              })}
            </div>

            {/* Contact Info */}
            <div className="space-y-3">
              {contactInfo.map((item, index) => {
                const Icon = item.icon;
                return (
                  <a
                    key={index}
                    href={item.href}
                    className="flex items-center gap-3 text-gray-400 hover:text-white transition-colors text-sm"
                    target={item.href.startsWith('http') ? '_blank' : undefined}
                    rel={item.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                  >
                    <Icon className="w-4 h-4" />
                    {item.text}
                  </a>
                );
              })}
            </div>
          </div>

          {/* Footer Links Columns */}
          {Object.values(footerLinks).map((column) => (
            <div key={column.title}>
              <h3 className="text-lg font-semibold mb-4">{column.title}</h3>
              <ul className="space-y-3">
                {column.links.map((link) => {
                  const Icon = link.icon;
                  return (
                    <li key={link.to}>
                      <Link
                        to={link.to}
                        className="text-gray-400 hover:text-white transition-colors flex items-center gap-2 text-sm group"
                      >
                        <Icon className="w-4 h-4 opacity-50 group-hover:opacity-100" />
                        {link.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        {/* App Store Badges */}
        <div className="border-t border-gray-800 pt-8 mb-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <span className="text-gray-400">Download our app:</span>
              <div className="flex gap-3">
                {appLinks.map((app) => (
                  <a
                    key={app.name}
                    href={app.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                  >
                    <img src={app.icon} alt={app.name} className="w-6 h-6" />
                    <div>
                      <p className="text-xs text-gray-400">Download on</p>
                      <p className="text-sm font-semibold">{app.name}</p>
                    </div>
                  </a>
                ))}
              </div>
            </div>

            {/* Newsletter Signup */}
            <div className="flex-1 max-w-md">
              <form className="flex gap-2">
                <input
                  type="email"
                  placeholder="Subscribe to our newsletter"
                  className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  Subscribe
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-800 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-400 text-sm">
              © {currentYear} InfluenceX. All rights reserved.
            </p>
            
            <div className="flex flex-wrap gap-6 justify-center">
              <Link to="/privacy" className="text-gray-400 hover:text-white text-sm transition-colors">
                Privacy Policy
              </Link>
              <Link to="/terms" className="text-gray-400 hover:text-white text-sm transition-colors">
                Terms of Service
              </Link>
              <Link to="/cookies" className="text-gray-400 hover:text-white text-sm transition-colors">
                Cookie Policy
              </Link>
              <Link to="/sitemap" className="text-gray-400 hover:text-white text-sm transition-colors">
                Sitemap
              </Link>
              <Link to="/accessibility" className="text-gray-400 hover:text-white text-sm transition-colors">
                Accessibility
              </Link>
            </div>

            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Globe className="w-4 h-4" />
              <select className="bg-transparent border-none text-gray-400 focus:outline-none cursor-pointer">
                <option value="en">English</option>
                <option value="es">Español</option>
                <option value="fr">Français</option>
                <option value="de">Deutsch</option>
              </select>
            </div>
          </div>

          {/* Trust Badges */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-8">
            <span className="text-gray-500 text-sm">PCI Compliant</span>
            <span className="text-gray-500 text-sm">GDPR Ready</span>
            <span className="text-gray-500 text-sm">SSL Secured</span>
            <span className="text-gray-500 text-sm">256-bit Encryption</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;