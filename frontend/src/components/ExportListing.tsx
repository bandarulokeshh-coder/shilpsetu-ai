import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FileJson, FileSpreadsheet } from 'lucide-react';
import { toAbsoluteUrl } from '../lib/utils';
import toast from 'react-hot-toast';

interface Product {
  id?: string;
  title: string;
  description: string;
  hindiDescription?: string;
  englishDescription?: string;
  category: string;
  material: string;
  dimensions?: string;
  quantity: number;
  minimumPrice?: number;
  suggestedPrice?: number;
  premiumPrice?: number;
  keywords?: string;
  imageUrl?: string;
  enhancedImageUrl?: string;
}

interface ExportListingProps {
  product: Product;
}

export default function ExportListing({ product }: ExportListingProps) {
  const { t } = useTranslation();
  const [isExporting, setIsExporting] = useState(false);

  const exportAsJSON = () => {
    setIsExporting(true);
    try {
      const exportData = {
        listing: {
          id: product.id || 'draft',
          title: product.title,
          description: product.description,
          hindiDescription: product.hindiDescription,
          englishDescription: product.englishDescription,
          category: product.category,
          material: product.material,
          dimensions: product.dimensions,
          quantity: product.quantity,
          pricing: {
            minimum: product.minimumPrice,
            suggested: product.suggestedPrice,
            premium: product.premiumPrice,
          },
          keywords: product.keywords?.split(',').map(k => k.trim()),
          images: {
            original: toAbsoluteUrl(product.imageUrl) || null,
            enhanced: toAbsoluteUrl(product.enhancedImageUrl) || null,
          },
          exportedAt: new Date().toISOString(),
          exportFormat: 'Craft2Market-v1.0',
        },
        metadata: {
          platform: 'Craft2Market AI',
          version: '1.0.0',
          note: 'This is a prototype export. For production use, integrate with ONDC or marketplace APIs.',
        },
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `craft2market-${product.title.toLowerCase().replace(/\s+/g, '-')}.json`;
      link.click();
      URL.revokeObjectURL(url);

      toast.success(t('catalogShare.exportedJson', 'Listing exported as JSON!'));
    } catch (error) {
      toast.error(t('catalogShare.exportJsonFailed', 'Failed to export JSON'));
    } finally {
      setIsExporting(false);
    }
  };

  const exportAsCSV = () => {
    setIsExporting(true);
    try {
      const csvRows = [
        // Header
        [
          'Title',
          'Description',
          'Hindi Description',
          'English Description',
          'Category',
          'Material',
          'Dimensions',
          'Quantity',
          'Minimum Price',
          'Suggested Price',
          'Premium Price',
          'Keywords',
          'Image URL',
        ],
        // Data
        [
          product.title,
          product.description,
          product.hindiDescription || '',
          product.englishDescription || '',
          product.category,
          product.material,
          product.dimensions || '',
          product.quantity.toString(),
          product.minimumPrice?.toString() || '',
          product.suggestedPrice?.toString() || '',
          product.premiumPrice?.toString() || '',
          product.keywords || '',
          toAbsoluteUrl(product.enhancedImageUrl || product.imageUrl),
        ],
      ];

      const csvContent = csvRows
        .map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
        .join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `craft2market-${product.title.toLowerCase().replace(/\s+/g, '-')}.csv`;
      link.click();
      URL.revokeObjectURL(url);

      toast.success(t('catalogShare.exportedCsv', 'Listing exported as CSV!'));
    } catch (error) {
      toast.error(t('catalogShare.exportCsvFailed', 'Failed to export CSV'));
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <button
        onClick={exportAsJSON}
        disabled={isExporting}
        className="btn-outline flex items-center justify-center gap-2"
      >
        <FileJson className="h-5 w-5" />
        {t('catalogShare.exportJson', 'Export as JSON')}
      </button>
      <button
        onClick={exportAsCSV}
        disabled={isExporting}
        className="btn-outline flex items-center justify-center gap-2"
      >
        <FileSpreadsheet className="h-5 w-5" />
        {t('catalogShare.exportCsv', 'Export as CSV')}
      </button>
    </div>
  );
}
