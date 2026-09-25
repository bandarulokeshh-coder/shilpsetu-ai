import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../lib/store';
import { authApi } from '../lib/api';
import toast from 'react-hot-toast';
import Layout from '../components/Layout';
import { UserPlus } from 'lucide-react';
import { LANGUAGES, CRAFT_TYPES } from '../lib/constants';

export default function RegisterPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    role: 'ARTISAN',
    preferredLanguage: 'en',
    location: '',
    craftType: '',
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await authApi.register(formData);
      setAuth(response.data.user, response.data.token);
      toast.success(t('auth.registerSuccess'));
      navigate('/dashboard');
    } catch (error: any) {
      toast.error(error.response?.data?.error || t('auth.registerFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
        <div className="max-w-2xl w-full">
          <div className="text-center mb-8">
            <UserPlus className="h-12 w-12 text-primary-600 mx-auto mb-4" />
            <h1 className="text-3xl font-bold mb-2">{t('auth.createAccount')}</h1>
            <p className="text-gray-600">{t('auth.joinTitle')}</p>
          </div>

          <div className="card">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">{t('auth.fullName')} *</label>
                  <input
                    type="text"
                    className="input"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">{t('auth.email')} *</label>
                  <input
                    type="email"
                    className="input"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">{t('auth.password')} *</label>
                  <input
                    type="password"
                    className="input"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                    minLength={6}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">{t('auth.phone')}</label>
                  <input
                    type="tel"
                    className="input"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">{t('auth.iAmA')} *</label>
                <select
                  className="input"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  required
                >
                  <option value="ARTISAN">{t('auth.artisan')}</option>
                  <option value="BUYER">{t('auth.buyer')}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">{t('auth.preferredLanguage')} *</label>
                <select
                  className="input"
                  value={formData.preferredLanguage}
                  onChange={(e) => setFormData({ ...formData, preferredLanguage: e.target.value })}
                  required
                >
                  {LANGUAGES.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.nativeName} ({lang.name})
                    </option>
                  ))}
                </select>
              </div>

              {formData.role === 'ARTISAN' && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-2">{t('auth.location')}</label>
                    <input
                      type="text"
                      className="input"
                      placeholder={t('auth.cityState')}
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">{t('auth.craftType')}</label>
                    <select
                      className="input"
                      value={formData.craftType}
                      onChange={(e) => setFormData({ ...formData, craftType: e.target.value })}
                    >
                      <option value="">{t('auth.selectCraftType')}</option>
                      {CRAFT_TYPES.map((craft) => (
                        <option key={craft} value={craft}>
                          {craft}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              <button type="submit" className="btn-primary w-full" disabled={loading}>
                {loading ? t('auth.creatingAccount') : t('auth.registerButton')}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                {t('auth.haveAccount')}{' '}
                <Link to="/login" className="text-primary-600 hover:underline font-medium">
                  {t('auth.loginHere')}
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
