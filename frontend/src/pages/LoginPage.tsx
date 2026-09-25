import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../lib/store';
import { authApi } from '../lib/api';
import toast from 'react-hot-toast';
import Layout from '../components/Layout';
import { LogIn } from 'lucide-react';

export default function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await authApi.login(formData.email, formData.password);
      setAuth(response.data.user, response.data.token);
      toast.success(t('auth.loginSuccess'));

      // Redirect based on role
      if (response.data.user.role === 'ADMIN') {
        navigate('/dashboard');
      } else if (response.data.user.role === 'ARTISAN') {
        navigate('/dashboard');
      } else {
        navigate('/marketplace');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || t('auth.loginFailed'));
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = async (email: string, password: string, role: string) => {
    setLoading(true);
    try {
      const response = await authApi.login(email, password);
      setAuth(response.data.user, response.data.token);
      toast.success(t('auth.loggedInAs', { role }));

      if (response.data.user.role === 'ADMIN') {
        navigate('/dashboard');
      } else if (response.data.user.role === 'ARTISAN') {
        navigate('/dashboard');
      } else {
        navigate('/marketplace');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || t('auth.loginFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <LogIn className="h-12 w-12 text-primary-600 mx-auto mb-4" />
            <h1 className="text-3xl font-bold mb-2">{t('auth.welcomeBack')}</h1>
            <p className="text-gray-600">{t('auth.signInTitle')}</p>
          </div>

          <div className="card">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">{t('auth.email')}</label>
                <input
                  type="email"
                  className="input"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">{t('auth.password')}</label>
                <input
                  type="password"
                  className="input"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                />
              </div>

              <button type="submit" className="btn-primary w-full" disabled={loading}>
                {loading ? t('auth.loggingIn') : t('auth.loginButton')}
              </button>
            </form>

            <div className="mt-6">
              <p className="text-sm text-gray-600 text-center mb-4">{t('auth.demoAccounts')}</p>
              <div className="space-y-2">
                <button
                  onClick={() => quickLogin('artisan@demo.com', 'demo123', 'Artisan')}
                  className="btn-outline w-full text-sm"
                  disabled={loading}
                >
                  {t('auth.loginAsArtisan')}
                </button>
                <button
                  onClick={() => quickLogin('buyer@demo.com', 'demo123', 'Buyer')}
                  className="btn-outline w-full text-sm"
                  disabled={loading}
                >
                  {t('auth.loginAsBuyer')}
                </button>
                <button
                  onClick={() => quickLogin('admin@demo.com', 'demo123', 'Admin')}
                  className="btn-outline w-full text-sm"
                  disabled={loading}
                >
                  {t('auth.loginAsAdmin')}
                </button>
              </div>
            </div>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                {t('auth.dontHaveAccount')}{' '}
                <Link to="/register" className="text-primary-600 hover:underline font-medium">
                  {t('auth.registerHere')}
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
