import { useState, useRef, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import CameraCapture from '../components/CameraCapture';
import { useAuthStore } from '../lib/store';
import {
  enhanceProductImage,
  generateAngleVariants,
  DEFAULT_ENHANCE_OPTIONS,
  type BackgroundStyle,
  type EnhanceOptions,
  type EnhanceStep,
  type EnhanceStats,
  type OutputFormat,
  type AngleVariant,
} from '../lib/imageEnhancer';
import {
  Upload,
  Download,
  Check,
  Sparkles,
  Image as ImageIcon,
  SlidersHorizontal,
  Crop,
  RefreshCw,
  X,
  Wand2,
  Camera,
  Eraser,
  Sun,
  Square,
  RotateCcw,
  Copy,
} from 'lucide-react';
import toast from 'react-hot-toast';

const STEPS: EnhanceStep[] = ['lighting', 'background', 'formatting'];

const STEP_LABEL: Record<EnhanceStep, string> = {
  lighting: 'aiStudio.stepLighting',
  background: 'aiStudio.stepBackground',
  formatting: 'aiStudio.stepFormatting',
};

/** sessionStorage key CreateProduct reads to pick up a studio-enhanced photo. */
export const STUDIO_IMAGE_KEY = 'studio:enhancedImage';

export default function AIImageStudio() {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [enhancedSrc, setEnhancedSrc] = useState<string | null>(null);
  const [stats, setStats] = useState<EnhanceStats | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeStep, setActiveStep] = useState<EnhanceStep | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showCamera, setShowCamera] = useState(false);

  const [options, setOptions] = useState<EnhanceOptions>(DEFAULT_ENHANCE_OPTIONS);

  const [angleVariants, setAngleVariants] = useState<AngleVariant[]>([]);
  const [isGeneratingAngles, setIsGeneratingAngles] = useState(false);
  const [showAngleVariants, setShowAngleVariants] = useState(false);

  const originalCanvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Redirect if not authenticated (effect keeps the hook order stable).
  useEffect(() => {
    if (!isAuthenticated) navigate('/login', { replace: true });
  }, [isAuthenticated, navigate]);

  const handleFile = useCallback((file: File | undefined) => {
    if (!file || !file.type.startsWith('image/')) {
      toast.error(t('errors.selectValidImage'));
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      setImageSrc(result);
      setEnhancedSrc(null);
      setStats(null);
    };
    reader.readAsDataURL(file);
  }, [t]);

  const handleCameraCapture = useCallback((dataUrl: string) => {
    setImageSrc(dataUrl);
    setEnhancedSrc(null);
    setStats(null);
    setShowCamera(false);
    toast.success(t('aiStudio.photoCaptured'));
  }, [t]);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files?.[0]) {
        handleFile(e.dataTransfer.files?.[0]);
      }
    },
    [handleFile]
  );

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const updateOption = <K extends keyof EnhanceOptions>(key: K, value: EnhanceOptions[K]) => {
    setOptions((prev) => ({ ...prev, [key]: value }));
  };

  // Paint the original onto its preview canvas whenever a new photo arrives.
  useEffect(() => {
    if (!imageSrc) return;
    const canvas = originalCanvasRef.current;
    if (!canvas) return;
    const img = new Image();
    img.onload = () => {
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
      }
    };
    img.src = imageSrc;
  }, [imageSrc]);

  // ---- Enhancement pipeline (background removal + lighting + e-comm frame) ----
  const processImage = async () => {
    if (!imageSrc) {
      toast.error(t('errors.uploadFirst'));
      return;
    }

    setIsProcessing(true);
    setActiveStep(null);

    try {
      const result = await enhanceProductImage(imageSrc, options, (step) => setActiveStep(step));
      setEnhancedSrc(result.dataUrl);
      setStats(result.stats);
      toast.success(t('aiStudio.imageEnhanced'));
    } catch (err) {
      toast.error(t('errors.processFailed'));
    } finally {
      setIsProcessing(false);
      setActiveStep(null);
    }
  };

  // ---- Generate Angle Variants ----
  const handleGenerateAngles = async () => {
    if (!imageSrc) {
      toast.error(t('errors.uploadFirst'));
      return;
    }

    setIsGeneratingAngles(true);
    setShowAngleVariants(true);

    try {
      const variants = await generateAngleVariants(imageSrc, options);
      setAngleVariants(variants);
      toast.success(t('aiStudio.anglesGenerated'));
    } catch (err) {
      toast.error(t('errors.processFailed'));
    } finally {
      setIsGeneratingAngles(false);
    }
  };

  // ---- Download ----
  const handleDownload = () => {
    if (!enhancedSrc) {
      toast.error(t('errors.noEnhancedToDownload'));
      return;
    }
    const link = document.createElement('a');
    link.download = 'Craft2Market-enhanced.png';
    link.href = enhancedSrc;
    link.click();
    toast.success(t('aiStudio.imageDownloaded'));
  };

  // ---- Use This Image (hand off to Create Product) ----
  const handleUseImage = () => {
    if (!enhancedSrc) return;
    sessionStorage.setItem(STUDIO_IMAGE_KEY, enhancedSrc);
    toast.success(t('aiStudio.savedToProduct'), { duration: 2500 });
    navigate('/create-product');
  };

  // ---- Reset ----
  const handleReset = () => {
    setImageSrc(null);
    setEnhancedSrc(null);
    setStats(null);
    setActiveStep(null);
    setOptions(DEFAULT_ENHANCE_OPTIONS);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Build angle variants section
  const angleVariantsSection = showAngleVariants && angleVariants.length > 0 ? (
    <div className="card mt-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <RotateCcw className="h-6 w-6 text-primary-600" />
          <h2 className="text-lg font-semibold">{t('aiStudio.angleVariants')}</h2>
        </div>
        <button
          onClick={() => setShowAngleVariants(false)}
          className="text-gray-400 hover:text-gray-600"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <p className="text-sm text-gray-500 mb-4">{t('aiStudio.angleVariantsDesc')}</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {angleVariants.map((variant) => (
          <div key={variant.id} className="relative group">
            <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
              <img
                src={variant.dataUrl}
                alt={variant.label}
                className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
              />
            </div>
            <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {variant.label}
            </div>
            <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(variant.dataUrl);
                  toast.success(t('aiStudio.copiedToClipboard'));
                }}
                className="p-1 bg-white/90 rounded-full hover:bg-white"
                title={t('aiStudio.copyImage')}
              >
                <Copy className="h-4 w-4 text-gray-700" />
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        <button
          onClick={() => {
            angleVariants.forEach((v) => {
              const link = document.createElement('a');
              link.download = `Craft2Market-angle-${v.id}-${Date.now()}.png`;
              link.href = v.dataUrl;
              link.click();
            });
            toast.success(t('aiStudio.allDownloaded'));
          }}
          className="btn-outline flex items-center gap-2"
        >
          <Download className="h-4 w-4" />
          {t('aiStudio.downloadAll')}
        </button>
        <button
          onClick={() => {
            sessionStorage.setItem('studio:angleVariants', JSON.stringify(angleVariants));
            toast.success(t('aiStudio.savedForProduct'));
          }}
          className="btn-primary flex items-center gap-2"
        >
          <Check className="h-4 w-4" />
          {t('aiStudio.useAllInProduct')}
        </button>
      </div>
    </div>
  ) : null;

  // Early return for not authenticated
  if (!isAuthenticated) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <p className="text-gray-500">{t('common.loading')}</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!isAuthenticated ? (
          <p className="text-gray-500">{t('common.loading')}</p>
        ) : (
          <>
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
                <Wand2 className="h-8 w-8 text-primary-600" />
                {t('aiStudio.title')}
              </h1>
              <p className="text-gray-600">{t('aiStudio.subtitle')}</p>
            </div>

            {!imageSrc ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Upload */}
                <div
                  className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
                    isDragging
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-300 hover:border-primary-400 hover:bg-gray-50'
                  }`}
                  onDrop={onDrop}
                  onDragOver={onDragOver}
                  onDragLeave={onDragLeave}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFile(e.target.files?.[0])}
                  />
                  <Upload className="h-14 w-14 text-gray-300 mx-auto mb-4" />
                  <p className="text-lg font-medium text-gray-700 mb-2">
                    {t('aiStudio.uploadPrompt')}
                  </p>
                  <p className="text-sm text-gray-500">{t('aiStudio.fileTypes')}</p>
                </div>

                {/* Camera */}
                <button
                  type="button"
                  onClick={() => setShowCamera(true)}
                  className="border-2 border-dashed border-gray-300 rounded-xl p-10 text-center hover:border-primary-400 hover:bg-gray-50 transition-colors flex flex-col items-center justify-center"
                >
                  <Camera className="h-14 w-14 text-primary-400 mb-4" />
                  <p className="text-lg font-medium text-gray-700 mb-2">
                    {t('aiStudio.openCamera')}
                  </p>
                  <p className="text-sm text-gray-500">{t('aiStudio.cameraHint')}</p>
                </button>

                {/* Feature blurb */}
                <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="card bg-blue-50 border-blue-200">
                    <Eraser className="h-6 w-6 text-blue-500 mb-2" />
                    <h3 className="font-semibold mb-1">{t('aiStudio.removeBackground')}</h3>
                    <p className="text-sm text-gray-600">{t('aiStudio.removeBackgroundDesc')}</p>
                  </div>
                  <div className="card bg-amber-50 border-amber-200">
                    <Sun className="h-6 w-6 text-amber-500 mb-2" />
                    <h3 className="font-semibold mb-1">{t('aiStudio.correctLighting')}</h3>
                    <p className="text-sm text-gray-600">{t('aiStudio.correctLightingDesc')}</p>
                  </div>
                  <div className="card bg-green-50 border-green-200">
                    <Square className="h-6 w-6 text-green-500 mb-2" />
                    <h3 className="font-semibold mb-1">{t('aiStudio.ecommerceFormat')}</h3>
                    <p className="text-sm text-gray-600">{t('aiStudio.ecommerceFormatDesc')}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                {/* Original vs Enhanced Preview */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Original */}
                  <div className="card">
                    <div className="flex items-center gap-2 mb-4">
                      <ImageIcon className="h-5 w-5 text-gray-500" />
                      <h2 className="text-lg font-semibold">{t('aiStudio.original')}</h2>
                    </div>
                    <div className="relative bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center min-h-[300px]">
                      <canvas
                        ref={originalCanvasRef}
                        className="max-h-[400px] w-auto object-contain rounded-lg"
                      />
                    </div>
                  </div>

                  {/* Enhanced */}
                  <div className="card">
                    <div className="flex items-center gap-2 mb-4">
                      <Sparkles className="h-5 w-5 text-primary-500" />
                    <h2 className="text-lg font-semibold">{t('aiStudio.enhanced')}</h2>
                  </div>
                  <div className="relative bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center min-h-[300px]">
                  {enhancedSrc ? (
                    <img
                      src={enhancedSrc}
                      alt={t('errors.altEnhanced')}
                      className="max-h-[400px] w-auto object-contain rounded-lg"
                    />
                  ) : isProcessing ? (
                    <div className="flex flex-col items-center justify-center py-12 px-4">
                      <RefreshCw className="h-10 w-10 text-primary-600 animate-spin mb-3" />
                      <div className="space-y-1 text-sm text-gray-500 text-center">
                        {STEPS.map((step) => (
                          <p
                            key={step}
                            className={
                              activeStep === step
                                ? 'text-primary-600 font-medium'
                                : STEPS.indexOf(step) < STEPS.indexOf(activeStep ?? 'lighting')
                                  ? 'text-green-600'
                                  : 'text-gray-400'
                            }
                          >
                            {activeStep === step ? '▸ ' : STEPS.indexOf(step) < STEPS.indexOf(activeStep ?? 'lighting') ? '✓ ' : '○ '}
                            {t(STEP_LABEL[step])}
                          </p>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12">
                      <Sparkles className="h-10 w-10 text-gray-300 mb-3" />
                      <p className="text-gray-400">{t('aiStudio.clickEnhance')}</p>
                    </div>
                  )}
                </div>
                {stats && enhancedSrc && (
                  <div className="mt-3 text-xs text-gray-500 space-y-0.5">
                    {options.removeBackground && (
                      <p>
                        {t('aiStudio.statBackground')}:{' '}
                        {(stats.removedFraction * 100).toFixed(1)}%
                      </p>
                    )}
                    {options.correctLighting && stats.lightingRange && (
                      <p>
                        {t('aiStudio.statLighting')}: {stats.lightingRange.low}–
                        {stats.lightingRange.high}
                      </p>
                    )}
                    {stats.bounds && (
                      <p>
                        {t('aiStudio.statProduct')}: {stats.bounds.width}×{stats.bounds.height}px
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Processing options */}
            <div className="card">
              <div className="flex items-center gap-2 mb-4">
                <SlidersHorizontal className="h-5 w-5 text-gray-500" />
                <h2 className="text-lg font-semibold">{t('aiStudio.optionsTitle')}</h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={options.removeBackground}
                    onChange={(e) => updateOption('removeBackground', e.target.checked)}
                  />
                  <span>
                    <span className="font-medium block">{t('aiStudio.removeBackground')}</span>
                    <span className="text-sm text-gray-500">
                      {t('aiStudio.removeBackgroundDesc')}
                    </span>
                  </span>
                </label>

                <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={options.correctLighting}
                    onChange={(e) => updateOption('correctLighting', e.target.checked)}
                  />
                  <span>
                    <span className="font-medium block">{t('aiStudio.correctLighting')}</span>
                    <span className="text-sm text-gray-500">
                      {t('aiStudio.correctLightingDesc')}
                    </span>
                  </span>
                </label>

                <div className="p-3 border rounded-lg">
                  <span className="font-medium block mb-2">{t('aiStudio.outputFormat')}</span>
                  <div className="flex gap-2">
                    {(['square', 'original'] as OutputFormat[]).map((fmt) => (
                      <button
                        key={fmt}
                        type="button"
                        onClick={() => updateOption('format', fmt)}
                        className={`px-3 py-1.5 rounded-lg text-sm border ${
                          options.format === fmt
                            ? 'bg-primary-600 text-white border-primary-600'
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {fmt === 'square' ? t('aiStudio.formatSquare') : t('aiStudio.formatOriginal')}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-3 border rounded-lg">
                  <span className="font-medium block mb-2">{t('aiStudio.backgroundStyle')}</span>
                  <div className="flex gap-2 flex-wrap">
                    {(['white', 'gradient', 'transparent'] as BackgroundStyle[]).map((bg) => (
                      <button
                        key={bg}
                        type="button"
                        onClick={() => updateOption('background', bg)}
                        className={`px-3 py-1.5 rounded-lg text-sm border ${
                          options.background === bg
                            ? 'bg-primary-600 text-white border-primary-600'
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {bg === 'white'
                          ? t('aiStudio.bgWhite')
                          : bg === 'gradient'
                            ? t('aiStudio.bgGradient')
                            : t('aiStudio.bgTransparent')}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={processImage}
                  disabled={isProcessing || !imageSrc}
                  className="btn-primary flex items-center justify-center gap-2 text-lg px-6 py-3 disabled:opacity-50"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="h-5 w-5 animate-spin" />
                      {t('aiStudio.processing')}
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-5 w-5" />
                      {t('aiStudio.enhanceImage')}
                    </>
                  )}
                </button>

                <button
                  onClick={handleDownload}
                  disabled={!enhancedSrc}
                  className="btn-outline flex items-center justify-center gap-2 text-lg px-6 py-3 disabled:opacity-50"
                >
                  <Download className="h-5 w-5" />
                  {t('aiStudio.downloadEnhanced')}
                </button>

                <button
                  onClick={handleUseImage}
                  disabled={!enhancedSrc}
                  className="btn-outline flex items-center justify-center gap-2 text-lg px-6 py-3 disabled:opacity-50"
                >
                  <Check className="h-5 w-5" />
                  {t('aiStudio.useInProduct')}
                </button>

                <button
                  onClick={handleGenerateAngles}
                  disabled={isGeneratingAngles || !imageSrc}
                  className="btn-outline flex items-center justify-center gap-2 text-lg px-6 py-3 disabled:opacity-50"
                >
                  {isGeneratingAngles ? (
                    <>
                      <RefreshCw className="h-5 w-5 animate-spin" />
                      {t('aiStudio.generatingAngles')}
                    </>
                  ) : (
                    <>
                      <RotateCcw className="h-5 w-5" />
                      {t('aiStudio.generateAngles')}
                    </>
                  )}
                </button>

                <button
                  onClick={() => setShowCamera(true)}
                  className="btn-outline flex items-center justify-center gap-2 text-lg px-6 py-3"
                >
                  <Camera className="h-5 w-5" />
                  {t('aiStudio.takePhoto')}
                </button>

                <button
                  onClick={handleReset}
                  className="btn text-red-600 border-red-600 hover:bg-red-50 flex items-center justify-center gap-2 text-lg px-6 py-3"
                >
                  <X className="h-5 w-5" />
                  {t('aiStudio.reset')}
                </button>
              </div>
            </div>

            {/* Features Info */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="card bg-blue-50 border-blue-200">
                <Eraser className="h-6 w-6 text-blue-500 mb-2" />
                <h3 className="font-semibold mb-1">{t('aiStudio.removeBackground')}</h3>
                <p className="text-sm text-gray-600">{t('aiStudio.removeBackgroundDesc')}</p>
              </div>
              <div className="card bg-amber-50 border-amber-200">
                <Sun className="h-6 w-6 text-amber-500 mb-2" />
                <h3 className="font-semibold mb-1">{t('aiStudio.correctLighting')}</h3>
                <p className="text-sm text-gray-600">{t('aiStudio.correctLightingDesc')}</p>
              </div>
              <div className="card bg-green-50 border-green-200">
                <Crop className="h-6 w-6 text-green-500 mb-2" />
                <h3 className="font-semibold mb-1">{t('aiStudio.ecommerceFormat')}</h3>
                <p className="text-sm text-gray-600">{t('aiStudio.ecommerceFormatDesc')}</p>
              </div>
            </div>
          </div>
          )}

            {/* Angle Variants Carousel */}
            {angleVariantsSection}

            {showCamera && (
              <CameraCapture
                onCapture={handleCameraCapture}
                onClose={() => setShowCamera(false)}
              />
            )}
          </>
          )}
        </div>
      </Layout>
    );
  }
