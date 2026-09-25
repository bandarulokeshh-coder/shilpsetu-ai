import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Globe, Volume2, Eye, Type, CheckCircle } from 'lucide-react';
import { LANGUAGES } from '../lib/constants';
import { useAuthStore } from '../lib/store';

export default function WelcomePage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user, updateUser } = useAuthStore();
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [accessibilityMode, setAccessibilityMode] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    if (user?.preferredLanguage) {
      setSelectedLanguage(user.preferredLanguage);
    }
  }, [user]);

  const speak = (text: string, lang: string = 'en-IN') => {
    if ('speechSynthesis' in window) {
      setSpeaking(true);
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      utterance.rate = 0.9;
      utterance.onend = () => setSpeaking(false);
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleLanguageSelect = async (langCode: string) => {
    setSelectedLanguage(langCode);
    i18n.changeLanguage(langCode);

    const language = LANGUAGES.find(l => l.code === langCode);
    if (language) {
      speak(`You selected ${language.name}. Welcome to Craft2Market AI.`);
    }

    if (user) {
      try {
        await updateUser({ preferredLanguage: langCode });
      } catch (error) {
        console.error('Failed to update language preference');
      }
    }
  };

  const handleContinue = () => {
    if (user) {
      navigate('/dashboard');
    } else {
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-purple-50">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-100 border border-orange-300 rounded-full text-orange-800 text-sm font-medium mb-6">
            <Eye className="h-4 w-4" />
            Prototype / Demo Mode
          </div>
          <h1 className={`font-bold text-primary-700 mb-4 ${accessibilityMode ? 'text-5xl' : 'text-4xl'}`}>
            {t('welcome.title')}
          </h1>
          <p className={`text-gray-600 max-w-2xl mx-auto ${accessibilityMode ? 'text-2xl' : 'text-xl'}`}>
            {t('welcome.subtitle')}
          </p>
          <button
            onClick={() => speak('Welcome to Craft2Market AI. Select your preferred language to continue.')}
            className="mt-4 p-3 rounded-full bg-primary-100 text-primary-700 hover:bg-primary-200 transition-colors"
            title="Play welcome message"
          >
            <Volume2 className={`${accessibilityMode ? 'h-8 w-8' : 'h-6 w-6'}`} />
          </button>
        </div>

        {/* Accessibility Toggle */}
        <div className="flex justify-center mb-8">
          <button
            onClick={() => setAccessibilityMode(!accessibilityMode)}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg border-2 transition-all ${
              accessibilityMode
                ? 'bg-primary-600 text-white border-primary-600'
                : 'bg-white text-gray-700 border-gray-300 hover:border-primary-400'
            }`}
          >
            <Type className="h-5 w-5" />
            <span className="font-medium">
              {accessibilityMode ? 'Accessibility Mode: ON' : 'Enable Accessibility Mode'}
            </span>
          </button>
        </div>

        {/* Language Selection */}
        <div className="card mb-8">
          <div className="flex items-center gap-3 mb-6">
            <Globe className={`text-primary-600 ${accessibilityMode ? 'h-8 w-8' : 'h-6 w-6'}`} />
            <h2 className={`font-bold ${accessibilityMode ? 'text-3xl' : 'text-2xl'}`}>
              Select Your Language / अपनी भाषा चुनें
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                onClick={() => handleLanguageSelect(lang.code)}
                onMouseEnter={() => !speaking && speak(lang.name)}
                className={`relative p-6 rounded-xl border-2 transition-all text-left ${
                  accessibilityMode ? 'min-h-[140px]' : 'min-h-[120px]'
                } ${
                  selectedLanguage === lang.code
                    ? 'bg-primary-50 border-primary-500 shadow-lg'
                    : 'bg-white border-gray-200 hover:border-primary-300 hover:shadow-md'
                }`}
              >
                {selectedLanguage === lang.code && (
                  <div className="absolute top-3 right-3">
                    <CheckCircle className="h-6 w-6 text-primary-600" />
                  </div>
                )}
                <div className={`font-bold text-gray-900 mb-2 ${accessibilityMode ? 'text-3xl' : 'text-2xl'}`}>
                  {lang.nativeName}
                </div>
                <div className={`text-gray-600 ${accessibilityMode ? 'text-xl' : 'text-base'}`}>
                  {lang.name}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Features Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className={`card text-center bg-blue-50 border-blue-200 ${accessibilityMode ? 'p-8' : ''}`}>
            <Globe className={`mx-auto text-blue-600 mb-3 ${accessibilityMode ? 'h-10 w-10' : 'h-8 w-8'}`} />
            <h3 className={`font-semibold mb-2 ${accessibilityMode ? 'text-2xl' : 'text-lg'}`}>
              {t('welcome.voiceTitle', 'Voice Input')}
            </h3>
            <p className={`text-gray-600 ${accessibilityMode ? 'text-xl' : 'text-sm'}`}>
              {t('welcome.voiceDesc', 'Describe products using voice or text')}
            </p>
          </div>
          <div className={`card text-center bg-purple-50 border-purple-200 ${accessibilityMode ? 'p-8' : ''}`}>
            <Volume2 className={`mx-auto text-purple-600 mb-3 ${accessibilityMode ? 'h-10 w-10' : 'h-8 w-8'}`} />
            <h3 className={`font-semibold mb-2 ${accessibilityMode ? 'text-2xl' : 'text-lg'}`}>
              {t('welcome.audioTitle', 'Audio Guidance')}
            </h3>
            <p className={`text-gray-600 ${accessibilityMode ? 'text-xl' : 'text-sm'}`}>
              {t('welcome.audioDesc', 'Listen to instructions and labels')}
            </p>
          </div>
          <div className={`card text-center bg-green-50 border-green-200 ${accessibilityMode ? 'p-8' : ''}`}>
            <Type className={`mx-auto text-green-600 mb-3 ${accessibilityMode ? 'h-10 w-10' : 'h-8 w-8'}`} />
            <h3 className={`font-semibold mb-2 ${accessibilityMode ? 'text-2xl' : 'text-lg'}`}>
              {t('welcome.largeTextTitle', 'Large Text')}
            </h3>
            <p className={`text-gray-600 ${accessibilityMode ? 'text-xl' : 'text-sm'}`}>
              {t('welcome.largeTextDesc', 'Easy to read interface')}
            </p>
          </div>
        </div>

        {/* Continue Button */}
        <button
          onClick={handleContinue}
          disabled={!selectedLanguage}
          className={`btn-primary w-full flex items-center justify-center gap-3 ${
            accessibilityMode ? 'text-2xl py-6' : 'text-lg py-4'
          }`}
        >
          <CheckCircle className={accessibilityMode ? 'h-8 w-8' : 'h-6 w-6'} />
          {t('welcome.getStarted')}
        </button>

        <p className={`text-center text-gray-500 mt-6 ${accessibilityMode ? 'text-xl' : 'text-sm'}`}>
          {t('welcome.changeAnytime', 'You can change language anytime in Settings')}
        </p>
      </div>
    </div>
  );
}
