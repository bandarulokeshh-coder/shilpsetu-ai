import { QrCode } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

interface QRCodePreviewProps {
  productId: string;
  title: string;
}

export default function QRCodePreview({ productId, title }: QRCodePreviewProps) {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    generateQRCode();
  }, [productId]);

  const generateQRCode = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = 200;
    canvas.width = size;
    canvas.height = size;

    // Simple QR code simulation using a grid pattern
    // In production, use a library like qrcode or qrcode.react
    // const productUrl = `${window.location.origin}/product/${productId}`;

    // White background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, size, size);

    // Black border
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, size, 10);
    ctx.fillRect(0, size - 10, size, 10);
    ctx.fillRect(0, 0, 10, size);
    ctx.fillRect(size - 10, 0, 10, size);

    // Generate pseudo-random pattern based on productId
    const seed = productId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const random = (index: number) => {
      const x = Math.sin(seed + index) * 10000;
      return x - Math.floor(x);
    };

    // Draw grid pattern
    const blockSize = 8;
    const gridSize = Math.floor((size - 40) / blockSize);

    for (let i = 0; i < gridSize; i++) {
      for (let j = 0; j < gridSize; j++) {
        if (random(i * gridSize + j) > 0.5) {
          ctx.fillRect(
            20 + i * blockSize,
            20 + j * blockSize,
            blockSize - 1,
            blockSize - 1
          );
        }
      }
    }

    // Add positioning squares (corners)
    const squareSize = 30;
    const drawPositioningSquare = (x: number, y: number) => {
      ctx.fillStyle = '#000000';
      ctx.fillRect(x, y, squareSize, squareSize);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(x + 5, y + 5, squareSize - 10, squareSize - 10);
      ctx.fillStyle = '#000000';
      ctx.fillRect(x + 10, y + 10, squareSize - 20, squareSize - 20);
    };

    drawPositioningSquare(15, 15);
    drawPositioningSquare(size - 45, 15);
    drawPositioningSquare(15, size - 45);
  };

  const downloadQRCode = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = `qr-${title.toLowerCase().replace(/\s+/g, '-')}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-4">
        <QrCode className="h-5 w-5 text-primary-600" />
        <h3 className="font-semibold">{t('catalogShare.qrCode')}</h3>
      </div>
      <div className="flex flex-col items-center gap-4">
        <div className="bg-white p-4 rounded-lg border-2 border-gray-200">
          <canvas ref={canvasRef} className="w-48 h-48" />
        </div>
        <p className="text-sm text-gray-600 text-center max-w-xs">
          {t('catalogShare.qrHint', 'Share this QR code for buyers to quickly access this product listing')}
        </p>
        <button onClick={downloadQRCode} className="btn-outline text-sm">
          {t('catalogShare.downloadQR')}
        </button>
        <p className="text-xs text-orange-600 bg-orange-50 px-3 py-1 rounded">
          {t('catalogShare.prototypeNote', 'Prototype: Uses simulated QR code pattern')}
        </p>
      </div>
    </div>
  );
}
