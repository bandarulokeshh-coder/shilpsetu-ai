import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Layout from '../components/Layout';
import CameraCapture from '../components/CameraCapture';
import { productsApi, aiApi } from '../lib/api';
import { useAuthStore } from '../lib/store';
import { getImageUrl } from '../lib/utils';
import { enhanceProductImage } from '../lib/imageEnhancer';
import { STUDIO_IMAGE_KEY } from './AIImageStudio';
import { CATEGORIES, MATERIALS } from '../lib/constants';
import {
  Upload, Sparkles, Mic, MicOff, DollarSign, Save, ArrowLeft,
  RefreshCw, CheckCircle2, Camera, Wand2
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function CreateProduct() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const isEditing = !!id;

  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [enhancedImage, setEnhancedImage] = useState<string | null>(null);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [pricing, setPricing] = useState<any>(null);
  const [isCalculatingPricing, setIsCalculatingPricing] = useState(false);
  const [showCamera, setShowCamera] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    hindiDescription: '',
    englishDescription: '',
    category: '',
    material: '',
    dimensions: '',
    quantity: 1,
    rawMaterialCost: 0,
    labourCost: 0,
    packagingCost: 50,
    otherCost: 0,
    minimumPrice: 0,
    suggestedPrice: 0,
    premiumPrice: 0,
    keywords: '',
    imageUrl: null as File | null,
    enhancedImageUrl: '',
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) {
      loadProduct();
    }
  }, [id]);

  // Pick up an image enhanced in the AI Image Studio ("Use This Image").
  useEffect(() => {
    if (isEditing) return;
    const studioImage = sessionStorage.getItem(STUDIO_IMAGE_KEY);
    if (studioImage) {
      sessionStorage.removeItem(STUDIO_IMAGE_KEY);
      setImagePreview(studioImage);
      setEnhancedImage(studioImage);
      // Ship it as a PNG file so the normal multipart upload path works.
      fetch(studioImage)
        .then((res) => res.blob())
        .then((blob) => {
          setFormData((prev) => ({
            ...prev,
            imageUrl: new File([blob], 'studio-enhanced.png', { type: 'image/png' }),
          }));
        })
        .catch(() => undefined);
      toast.success(t('createProduct.studioImageLoaded'));
    }
  }, [isEditing]);

  const loadProduct = async () => {
    try {
      const response = await productsApi.getById(id!);
      const product = response.data;
      setFormData({
        title: product.title,
        description: product.description,
        hindiDescription: product.hindiDescription || '',
        englishDescription: product.englishDescription || '',
        category: product.category,
        material: product.material,
        dimensions: product.dimensions || '',
        quantity: product.quantity,
        rawMaterialCost: product.rawMaterialCost,
        labourCost: product.labourCost,
        packagingCost: product.packagingCost,
        otherCost: product.otherCost,
        minimumPrice: product.minimumPrice || 0,
        suggestedPrice: product.suggestedPrice || 0,
        premiumPrice: product.premiumPrice || 0,
        keywords: product.keywords || '',
        imageUrl: null,
        enhancedImageUrl: product.enhancedImageUrl || '',
      });
      if (product.imageUrl || product.enhancedImageUrl) {
        setImagePreview(getImageUrl(product.enhancedImageUrl || product.imageUrl));
        setEnhancedImage(getImageUrl(product.enhancedImageUrl || product.imageUrl));
      }
    } catch (error) {
      toast.error(t('errors.loadFailed'));
      navigate('/dashboard');
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData({ ...formData, imageUrl: file });
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
        setEnhancedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCameraCapture = (dataUrl: string) => {
    setShowCamera(false);
    setImagePreview(dataUrl);
    setEnhancedImage(dataUrl);
    fetch(dataUrl)
      .then((res) => res.blob())
      .then((blob) => {
        setFormData((prev) => ({
          ...prev,
          imageUrl: new File([blob], 'camera-capture.png', { type: 'image/png' }),
        }));
      })
      .catch(() => undefined);
    toast.success(t('createProduct.photoCaptured'));
  };

  const enhanceImage = async () => {
    if (!imagePreview) {
      toast.error(t('createProduct.uploadImage'));
      return;
    }

    setIsEnhancing(true);
    try {
      const result = await enhanceProductImage(imagePreview, {
        removeBackground: true,
        correctLighting: true,
        format: 'square',
        background: 'white',
      });
      setEnhancedImage(result.dataUrl);
      setFormData((prev) => ({ ...prev, enhancedImageUrl: result.dataUrl }));
      toast.success(t('createProduct.imageEnhancedSuccess'));
    } catch (error) {
      toast.error(t('errors.generic'));
    } finally {
      setIsEnhancing(false);
    }
  };

  const generateCatalog = async () => {
    if (!formData.description && !formData.title) {
      toast.error(t('createProduct.descriptionRequired'));
      return;
    }

    setIsGenerating(true);
    try {
      const response = await aiApi.generateCatalog({
        description: formData.description || formData.title,
        language: user?.preferredLanguage || 'en',
        productData: { category: formData.category, material: formData.material },
      });

      const data = response.data;
      setFormData({
        ...formData,
        title: data.title,
        description: data.detailedDescription || data.shortDescription,
        hindiDescription: data.hindiDescription,
        englishDescription: data.englishDescription,
        keywords: data.keywords,
        category: data.category,
        material: data.material,
      });
      toast.success(t('createProduct.catalogGenerated'));
      setStep(3);
    } catch (error) {
      toast.error(t('errors.generic'));
    } finally {
      setIsGenerating(false);
    }
  };

  const calculatePricing = async () => {
    setIsCalculatingPricing(true);
    try {
      const response = await aiApi.calculatePricing({
        rawMaterialCost: formData.rawMaterialCost,
        labourCost: formData.labourCost,
        packagingCost: formData.packagingCost,
        otherCost: formData.otherCost,
        quantity: formData.quantity,
        description: formData.description || formData.title,
        category: formData.category,
      });

      const data = response.data;
      setPricing(data);
      setFormData({
        ...formData,
        minimumPrice: data.pricing.minimum.price,
        suggestedPrice: data.pricing.suggested.price,
        premiumPrice: data.pricing.premium.price,
      });
      toast.success(t('createProduct.pricingCalculated'));
    } catch (error) {
      toast.error(t('errors.generic'));
    } finally {
      setIsCalculatingPricing(false);
    }
  };

  const startVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast.error(t('createProduct.voiceNotSupported'));
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-IN';
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setFormData({ ...formData, description: formData.description + ' ' + transcript });
      toast.success(t('createProduct.voiceCaptured'));
    };

    recognition.onerror = () => {
      toast.error(t('createProduct.voiceError'));
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  /**
   * `status` decides what happens to the listing:
   *   DRAFT    -> private to the artisan ({t('createProduct.saveDraft')})
   *   APPROVED -> live in the buyer marketplace (Publish)
   * Without this the backend used to store every submission as PENDING, so a
   * "published" product never appeared in the marketplace.
   */
  const handleSubmit = async (status: 'DRAFT' | 'APPROVED') => {
    setLoading(true);
    try {
      const submitData = new FormData();

      Object.entries(formData).forEach(([key, value]) => {
        if (key === 'imageUrl' && value) {
          submitData.append(key, value as File);
        } else if (key !== 'imageUrl' && key !== 'enhancedImageUrl') {
          submitData.append(key, String(value));
        }
      });

      if (enhancedImage) {
        submitData.append('enhancedImageUrl', enhancedImage);
      }

      submitData.append('status', status);

      const wantsDraft = status === 'DRAFT';

      if (isEditing) {
        await productsApi.update(id!, submitData);
        toast.success(wantsDraft ? t('createProduct.draftSaved') : t('createProduct.productUpdated'));
      } else {
        await productsApi.create(submitData);
        toast.success(wantsDraft ? t('createProduct.draftSaved') : t('createProduct.productPublished'));
      }

      navigate('/dashboard');
    } catch (error: any) {
      toast.error(error.response?.data?.error || t('errors.generic'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link to="/dashboard" className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-bold">
            {isEditing ? t('createProduct.editProduct') : t('createProduct.createNewProduct')}
          </h1>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-8">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="flex items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                  step >= s
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                {s}
              </div>
              {s < 4 && (
                <div className={`w-20 h-1 ${step > s ? 'bg-primary-600' : 'bg-gray-200'}`} />
              )}
            </div>
          ))}
        </div>

        <div className="space-y-6">
          {/* Step 1: Image Upload */}
          {step === 1 && (
            <div className="card">
              <h2 className="text-xl font-bold mb-4">{t('createProduct.step1')}</h2>

              <div
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center mb-4 cursor-pointer hover:border-primary-500"
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                />
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt={t('createProduct.preview')}
                    className="max-h-64 mx-auto rounded-lg"
                  />
                ) : (
                  <div>
                    <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">
                      {t('createProduct.clickToUpload')}
                    </p>
                    <p className="text-sm text-gray-500">{t('createProduct.fileTypes')}</p>
                  </div>
                )}
              </div>

              {/* Camera + AI Studio intake */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowCamera(true);
                  }}
                  className="btn-outline flex items-center justify-center gap-2"
                >
                  <Camera className="h-5 w-5" />
                  {t('createProduct.takePhoto')}
                </button>
                <Link to="/ai-image-studio" className="btn-outline flex items-center justify-center gap-2">
                  <Wand2 className="h-5 w-5" />
                  {t('createProduct.openAiStudio')}
                </Link>
              </div>

              <button
                onClick={enhanceImage}
                disabled={!imagePreview || isEnhancing}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                {isEnhancing ? (
                  <>
                    <RefreshCw className="h-5 w-5 animate-spin" />
                    {t('createProduct.enhancing')}
                  </>
                ) : (
                  <>
                    <Sparkles className="h-5 w-5" />
                    {t('createProduct.enhanceImage')}
                  </>
                )}
              </button>

              {enhancedImage && (
                <div className="mt-6">
                  <h3 className="font-semibold mb-3">{t('createProduct.enhancedImage')}</h3>
                  <img
                    src={enhancedImage}
                    alt={t('createProduct.enhancedImage')}
                    className="max-h-48 mx-auto rounded-lg"
                  />
                </div>
              )}

              <button
                onClick={() => setStep(2)}
                disabled={!imagePreview}
                className="btn-primary w-full mt-6"
              >
                {t('createProduct.nextDescription')}
              </button>
            </div>
          )}

          {/* Step 2: Description */}
          {step === 2 && (
            <div className="card">
              <h2 className="text-xl font-bold mb-4">{t('createProduct.step2')}</h2>

              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">
                  {t('createProduct.descriptionLabel')}
                </label>
                <div className="relative">
                  <textarea
                    className="input pr-16"
                    rows={6}
                    placeholder={t('createProduct.descriptionPlaceholder')}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                  <button
                    type="button"
                    onClick={startVoiceInput}
                    className={`absolute right-3 top-3 p-2 rounded-full ${
                      isListening ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-700'
                    }`}
                  >
                    {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                  </button>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  {t('createProduct.voiceHint')}
                </p>
              </div>

              <button
                onClick={generateCatalog}
                disabled={isGenerating || (!formData.description && !formData.title)}
                className="btn-primary w-full flex items-center justify-center gap-2 mb-4"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="h-5 w-5 animate-spin" />
                    {t('createProduct.generating')}
                  </>
                ) : (
                  <>
                    <Sparkles className="h-5 w-5" />
                    {t('createProduct.generateCatalog')}
                  </>
                )}
              </button>

              <div className="flex gap-4">
                <button onClick={() => setStep(1)} className="btn-outline flex-1">
                  {t('common.back')}
                </button>
                <button onClick={() => setStep(3)} className="btn-primary flex-1">
                  {t('createProduct.skipContinue')}
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Details */}
          {step === 3 && (
            <div className="card">
              <h2 className="text-xl font-bold mb-4">{t('createProduct.step3')}</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-2">{t('common.title')}</label>
                  <input
                    type="text"
                    className="input"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder={t('createProduct.productTitleLabel')}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">{t('common.category')}</label>
                  <select
                    className="input"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  >
                    <option value="">{t('createProduct.selectCategory')}</option>
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">{t('common.material')}</label>
                  <select
                    className="input"
                    value={formData.material}
                    onChange={(e) => setFormData({ ...formData, material: e.target.value })}
                  >
                    <option value="">{t('createProduct.selectMaterial')}</option>
                    {MATERIALS.map((mat) => (
                      <option key={mat} value={mat}>{mat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">{t('common.dimensions')}</label>
                  <input
                    type="text"
                    className="input"
                    value={formData.dimensions}
                    onChange={(e) => setFormData({ ...formData, dimensions: e.target.value })}
                    placeholder={t('createProduct.dimensionsPlaceholder')}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">{t('common.quantity')}</label>
                  <input
                    type="number"
                    className="input"
                    min="1"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-2">{t('createProduct.keywordsLabel')}</label>
                  <input
                    type="text"
                    className="input"
                    value={formData.keywords}
                    onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
                    placeholder={t('createProduct.keywordsPlaceholder')}
                  />
                </div>
              </div>

              <div className="flex gap-4 mt-6">
                <button onClick={() => setStep(2)} className="btn-outline flex-1">
                  {t('common.back')}
                </button>
                <button onClick={() => setStep(4)} className="btn-primary flex-1">
                  {t('createProduct.nextPricing')}
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Pricing */}
          {step === 4 && (
            <div className="card">
              <h2 className="text-xl font-bold mb-4">{t('createProduct.step4')}</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">{t('createProduct.rawMaterialCost')}</label>
                  <input
                    type="number"
                    className="input"
                    value={formData.rawMaterialCost}
                    onChange={(e) => setFormData({ ...formData, rawMaterialCost: parseFloat(e.target.value) || 0 })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">{t('createProduct.labourCost')}</label>
                  <input
                    type="number"
                    className="input"
                    value={formData.labourCost}
                    onChange={(e) => setFormData({ ...formData, labourCost: parseFloat(e.target.value) || 0 })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">{t('createProduct.packagingCost')}</label>
                  <input
                    type="number"
                    className="input"
                    value={formData.packagingCost}
                    onChange={(e) => setFormData({ ...formData, packagingCost: parseFloat(e.target.value) || 0 })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">{t('createProduct.otherCosts')}</label>
                  <input
                    type="number"
                    className="input"
                    value={formData.otherCost}
                    onChange={(e) => setFormData({ ...formData, otherCost: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <button
                onClick={calculatePricing}
                disabled={isCalculatingPricing}
                className="btn-primary w-full mt-4 flex items-center justify-center gap-2"
              >
                {isCalculatingPricing ? (
                  <RefreshCw className="h-5 w-5 animate-spin" />
                ) : (
                  <DollarSign className="h-5 w-5" />
                )}
                {t('createProduct.calculatePrices')}
              </button>

              {pricing && (
                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-semibold mb-4">{t('createProduct.pricingRecommendations')}</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <p className="text-sm text-gray-600">{t('createProduct.minimum')}</p>
                      <p className="text-xl font-bold">₹{Math.round(pricing.pricing.minimum.price)}</p>
                      <p className="text-xs text-gray-500">{Math.round(pricing.pricing.minimum.margin)}% {t('common.marginPercent')}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-600">{t('createProduct.suggested')}</p>
                      <p className="text-xl font-bold text-primary-600">₹{Math.round(pricing.pricing.suggested.price)}</p>
                      <p className="text-xs text-gray-500">{Math.round(pricing.pricing.suggested.margin)}% {t('common.marginPercent')}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-600">{t('createProduct.premium')}</p>
                      <p className="text-xl font-bold">₹{Math.round(pricing.pricing.premium.price)}</p>
                      <p className="text-xs text-gray-500">{Math.round(pricing.pricing.premium.margin)}% {t('common.marginPercent')}</p>
                    </div>
                  </div>

                  {pricing.analysis && (
                    <div className="mt-6 border-t border-gray-200 pt-4">
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-primary-500" />
                        {t('createProduct.marketAnalysis', 'AI Market Analysis')}
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600 mb-1">
                            {t('createProduct.analysisCategory', 'Detected category')}
                          </p>
                          <p className="font-medium">{pricing.analysis.category}</p>
                        </div>
                        <div>
                          <p className="text-gray-600 mb-1">
                            {t('createProduct.analysisCraft', 'Detected technique')}
                          </p>
                          <p className="font-medium">{pricing.analysis.craft}</p>
                        </div>
                        <div>
                          <p className="text-gray-600 mb-1">
                            {t('createProduct.analysisDemand', 'Market demand')}
                          </p>
                          <div className="flex items-center gap-2">
                            <span className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full font-medium">
                              {pricing.analysis.trend.label}
                            </span>
                            <span className="text-xs text-gray-500">
                              {pricing.analysis.trend.demand}/100
                            </span>
                          </div>
                          <div className="mt-1.5 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary-500 rounded-full"
                              style={{ width: `${Math.min(100, pricing.analysis.trend.demand)}%` }}
                            />
                          </div>
                        </div>
                        <div>
                          <p className="text-gray-600 mb-1">
                            {t('createProduct.analysisComplexity', 'Craft complexity')}
                          </p>
                          <p className="font-medium">
                            {pricing.analysis.complexity.label} (×{pricing.analysis.complexity.index.toFixed(2)})
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {t('createProduct.analysisMarginField', 'Suggested margin')}:{' '}
                            {pricing.analysis.effectiveMargin}% (
                            {t('createProduct.analysisMultiplier', 'market multiplier')}: ×
                            {pricing.analysis.marketMultiplier.toFixed(3)})
                          </p>
                        </div>
                      </div>
                      <div className="mt-4">
                        <p className="text-gray-600 mb-1">
                          {t('createProduct.analysisWhy', 'Why this price?')}
                        </p>
                        <ul className="space-y-1 text-xs text-gray-600">
                          {pricing.analysis.reasoning.map((line: string, idx: number) => (
                            <li key={idx} className="flex items-start gap-1.5">
                              <span className="text-primary-500 mt-0.5">•</span>
                              <span>{line}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-4 mt-6">
                <button onClick={() => setStep(3)} className="btn-outline sm:flex-1">
                  {t('common.back')}
                </button>
                <button
                  onClick={() => handleSubmit('DRAFT')}
                  disabled={loading}
                  className="btn-outline sm:flex-1 flex items-center justify-center gap-2"
                >
                  <Save className="h-5 w-5" />
                  {t('createProduct.saveDraft')}
                </button>
                <button
                  onClick={() => handleSubmit('APPROVED')}
                  disabled={loading}
                  className="btn-primary sm:flex-1 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <RefreshCw className="h-5 w-5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-5 w-5" />
                  )}
                  {isEditing ? t('createProduct.savePublish') : t('createProduct.publishProduct')}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-3">
                {t('createProduct.packagingNote')}
              </p>
            </div>
          )}
        </div>

        {showCamera && (
          <CameraCapture
            onCapture={handleCameraCapture}
            onClose={() => setShowCamera(false)}
          />
        )}
      </div>
    </Layout>
  );
}