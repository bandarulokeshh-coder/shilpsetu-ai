import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../lib/store';
import { LogOut, Menu, X, Globe, ShoppingCart, Wand2, UserPlus } from 'lucide-react';
import { useState } from 'react';
import LanguageSwitcher from './LanguageSwitcher';
import NotificationBell from './NotificationBell';
import { useCartStore, cartCount } from '../lib/cart';

export default function Navbar() {
  const { t } = useTranslation();
  const { isAuthenticated, user, logout } = useAuthStore();
  const { pathname } = useLocation();
  const isHomePage = pathname === '/';
  const cartItems = useCartStore((s) => s.items);
  const itemCount = cartCount(cartItems);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="bg-white shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <Globe className="h-8 w-8 text-primary-600" />
            <span className="text-2xl font-bold text-primary-600">{t('nav.brand')}</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6">
            <LanguageSwitcher compact />
            <Link to="/marketplace" className="text-gray-700 hover:text-primary-600 font-medium">
              {t('nav.marketplace')}
            </Link>
            <NotificationBell />
            {!isHomePage && (
              <Link
                to="/cart"
                className="relative text-gray-700 hover:text-primary-600"
                aria-label={t('nav.cart')}
              >
                <ShoppingCart className="h-6 w-6" />
                {itemCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-primary-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {itemCount}
                  </span>
                )}
              </Link>
            )}

            {isAuthenticated ? (
              <>
                <Link to="/dashboard" className="text-gray-700 hover:text-primary-600 font-medium">
                  {t('nav.dashboard')}
                </Link>
                {user?.role === 'ARTISAN' && (
                  <Link
                    to="/create-product"
                    className="text-gray-700 hover:text-primary-600 font-medium"
                  >
                    {t('nav.createProduct')}
                  </Link>
                )}
                {user?.role === 'ARTISAN' && (
                  <Link to="/ai-image-studio" className="text-gray-700 hover:text-primary-600 font-medium flex items-center gap-1">
                    <Wand2 className="h-4 w-4" />
                    {t('nav.aiStudio')}
                  </Link>
                )}
                {user?.role === 'BUYER' && (
                  <Link to="/buyer/request" className="text-gray-700 hover:text-primary-600 font-medium flex items-center gap-1">
                    <UserPlus className="h-4 w-4" />
                    {t('nav.buyerRequest')}
                  </Link>
                )}
                <Link to="/enquiries" className="text-gray-700 hover:text-primary-600 font-medium">
                  {t('nav.enquiries')}
                </Link>
                <Link to="/orders" className="text-gray-700 hover:text-primary-600 font-medium">
                  {t('nav.orders')}
                </Link>
                <Link to="/settings" className="text-gray-700 hover:text-primary-600 font-medium">
                  {t('nav.settings')}
                </Link>
                <div className="flex items-center space-x-3">
                  <span className="text-sm text-gray-600">{user?.name}</span>
                  <button
                    onClick={logout}
                    className="flex items-center space-x-1 text-red-600 hover:text-red-700"
                  >
                    <LogOut className="h-5 w-5" />
                    <span>{t('nav.logout')}</span>
                  </button>
                </div>
              </>
            ) : (
              <>
                <Link to="/login" className="btn-outline">
                  {t('nav.login')}
                </Link>
                <Link to="/register" className="btn-primary">
                  {t('nav.register')}
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex md:hidden items-center space-x-2">
            <LanguageSwitcher compact />
            <button
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
            {mobileMenuOpen ? (
              <X className="h-6 w-6 text-gray-700" />
            ) : (
              <Menu className="h-6 w-6 text-gray-700" />
            )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 space-y-3">
            <Link
              to="/marketplace"
              className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded"
              onClick={() => setMobileMenuOpen(false)}
            >
              {t('nav.marketplace')}
            </Link>

            {!isHomePage && (
              <Link
                to="/cart"
                className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded"
                onClick={() => setMobileMenuOpen(false)}
              >
                {t('nav.cart')}
                {itemCount > 0 && ` (${itemCount})`}
              </Link>
            )}

            {isAuthenticated ? (
              <>
                <Link
                  to="/dashboard"
                  className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t('nav.dashboard')}
                </Link>
                {user?.role === 'ARTISAN' && (
                  <Link
                    to="/create-product"
                    className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {t('nav.createProduct')}
                  </Link>
                )}
                {user?.role === 'ARTISAN' && (
                  <Link
                    to="/ai-image-studio"
                    className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {t('nav.aiStudio')}
                  </Link>
                )}
                {user?.role === 'BUYER' && (
                  <Link
                    to="/buyer/request"
                    className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <UserPlus className="h-4 w-4 inline mr-2" />
                    {t('nav.buyerRequest')}
                  </Link>
                )}
                <Link
                  to="/enquiries"
                  className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t('nav.enquiries')}
                </Link>
                <Link
                  to="/orders"
                  className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t('nav.orders')}
                </Link>
                <Link
                  to="/settings"
                  className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t('nav.settings')}
                </Link>
                <button
                  onClick={() => {
                    logout();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full text-left px-4 py-2 text-red-600 hover:bg-gray-100 rounded"
                >
                  {t('nav.logout')}
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t('nav.login')}
                </Link>
                <Link
                  to="/register"
                  className="block px-4 py-2 text-primary-600 hover:bg-gray-100 rounded font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t('nav.register')}
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
