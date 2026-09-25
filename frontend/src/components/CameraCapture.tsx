import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Camera, RefreshCw, SwitchCamera, X, Upload } from 'lucide-react';
import toast from 'react-hot-toast';

interface CameraCaptureProps {
  /** Called with a PNG data URL of the captured frame. */
  onCapture: (dataUrl: string) => void;
  onClose: () => void;
}

/**
 * Built-in camera module for product photography.
 * Uses getUserMedia with a facing-mode switch (front/back) and draws the
 * live frame to a canvas on capture. Falls back to a file picker when the
 * camera is unavailable or permission is denied.
 */
export default function CameraCapture({ onCapture, onClose }: CameraCaptureProps) {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [facing, setFacing] = useState<'environment' | 'user'>('environment');
  const [status, setStatus] = useState<'starting' | 'live' | 'error'>('starting');
  const [errorMessage, setErrorMessage] = useState('');

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const startStream = useCallback(
    async (mode: 'environment' | 'user') => {
      stopStream();
      setStatus('starting');
      setErrorMessage('');

      if (!navigator.mediaDevices?.getUserMedia) {
        setStatus('error');
        setErrorMessage(t('aiStudio.cameraUnavailable'));
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: mode, width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => undefined);
        }
        setStatus('live');
      } catch (err: any) {
        const name = err?.name || '';
        if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
          setErrorMessage(t('aiStudio.cameraDenied'));
        } else {
          setErrorMessage(t('aiStudio.cameraUnavailable'));
        }
        setStatus('error');
      }
    },
    [stopStream, t]
  );

  useEffect(() => {
    startStream(facing);
    return stopStream;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facing]);

  const capture = () => {
    const video = videoRef.current;
    if (!video || status !== 'live') return;

    const width = video.videoWidth;
    const height = video.videoHeight;
    if (!width || !height) {
      toast.error(t('aiStudio.cameraUnavailable'));
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Mirror front-camera shots so the preview matches the capture.
    if (facing === 'user') {
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, width, height);
    onCapture(canvas.toDataURL('image/png'));
  };

  const onFallbackFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onloadend = () => onCapture(reader.result as string);
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h2 className="font-semibold flex items-center gap-2">
            <Camera className="h-5 w-5 text-primary-600" />
            {t('aiStudio.cameraTitle')}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 rounded-lg"
            aria-label={t('aiStudio.closeCamera')}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Viewport */}
        <div className="relative bg-black aspect-[4/3] flex items-center justify-center">
          {status === 'starting' && (
            <div className="flex flex-col items-center text-white/80">
              <RefreshCw className="h-8 w-8 animate-spin mb-2" />
              <p className="text-sm">{t('aiStudio.cameraStarting')}</p>
            </div>
          )}

          {status === 'error' && (
            <div className="flex flex-col items-center text-white/90 px-6 text-center">
              <Camera className="h-10 w-10 mb-3 opacity-60" />
              <p className="text-sm mb-4">{errorMessage}</p>
              <button
                onClick={() => fileRef.current?.click()}
                className="btn bg-white text-gray-900 hover:bg-gray-100 flex items-center gap-2"
              >
                <Upload className="h-4 w-4" />
                {t('aiStudio.uploadInstead')}
              </button>
            </div>
          )}

          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            className={`h-full w-full object-cover ${facing === 'user' ? 'scale-x-[-1]' : ''} ${
              status === 'live' ? '' : 'hidden'
            }`}
          />

          {/* Composition guide — helps artisans centre the product */}
          {status === 'live' && (
            <div className="pointer-events-none absolute inset-6 border-2 border-dashed border-white/40 rounded-lg" />
          )}
        </div>

        {/* Fallback file input (permission denied / no camera) */}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onFallbackFile}
        />

        {/* Controls */}
        <div className="flex items-center justify-between px-4 py-4 border-t">
          <button
            onClick={() => setFacing((f) => (f === 'environment' ? 'user' : 'environment'))}
            disabled={status === 'error'}
            className="btn-outline flex items-center gap-2 disabled:opacity-40"
            aria-label={t('aiStudio.switchCamera')}
          >
            <SwitchCamera className="h-4 w-4" />
            {t('aiStudio.switchCamera')}
          </button>

          <button
            onClick={capture}
            disabled={status !== 'live'}
            className="h-16 w-16 rounded-full bg-primary-600 hover:bg-primary-700 text-white flex items-center justify-center shadow-lg disabled:opacity-40 disabled:cursor-not-allowed transition-transform active:scale-95"
            aria-label={t('aiStudio.capture')}
          >
            <Camera className="h-7 w-7" />
          </button>

          <button onClick={onClose} className="btn text-gray-600 hover:bg-gray-100">
            {t('common.cancel')}
          </button>
        </div>
      </div>
    </div>
  );
}
