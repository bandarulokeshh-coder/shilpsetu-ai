import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Layout from '../components/Layout';
import { usersApi } from '../lib/api';
import { useAuthStore } from '../lib/store';
import { LANGUAGES } from '../lib/constants';
import { User as UserIcon, Save } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Settings() {
  const { t } = useTranslation();
  const { user, updateUser } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    preferredLanguage: 'en',
    location: '',
    craftType: '',
    bio: '',
  });

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name,
        phone: user.phone || '',
        preferredLanguage: user.preferredLanguage,
        location: user.location || '',
        craftType: user.craftType || '',
        bio: user.bio || '',
      });
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await usersApi.updateMe(formData);
      updateUser(response.data);
      toast.success(t('settings.profileUpdated'));
    } catch (error) {
      toast.error(t('settings.updateFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">{t('settings.title')}</h1>
          <p className="text-gray-600">{t('settings.manageSettings', 'Manage your account settings')}</p>
        </div>

        <div className="card">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
              <UserIcon className="h-8 w-8 text-gray-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">{user?.name}</h2>
              <p className="text-gray-600">{user?.email}</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">{t('settings.fullName')}</label>
              <input
                type="text"
                className="input"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">{t('settings.phone')}</label>
              <input
                type="tel"
                className="input"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">{t('settings.preferredLanguage')}</label>
              <select
                className="input"
                value={formData.preferredLanguage}
                onChange={(e) => setFormData({ ...formData, preferredLanguage: e.target.value })}
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.nativeName} ({lang.name})
                  </option>
                ))}
              </select>
            </div>

            {user?.role === 'ARTISAN' && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-2">{t('settings.location')}</label>
                  <input
                    type="text"
                    className="input"
                    placeholder={t('settings.cityState', 'City, State')}
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">{t('settings.craftType')}</label>
                  <input
                    type="text"
                    className="input"
                    placeholder={t('settings.craftTypePlaceholder', 'e.g., Weaving, Pottery')}
                    value={formData.craftType}
                    onChange={(e) => setFormData({ ...formData, craftType: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">{t('settings.bio')}</label>
                  <textarea
                    className="input"
                    rows={4}
                    placeholder={t('settings.bioPlaceholder', 'Tell buyers about yourself and your craft')}
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  />
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              <Save className="h-5 w-5" />
              {loading ? t('settings.saving', 'Saving...') : t('settings.saveChanges')}
            </button>
          </form>
        </div>
      </div>
    </Layout>
  );
}
