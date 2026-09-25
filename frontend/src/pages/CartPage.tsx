import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Layout from '../components/Layout';
import EmptyState from '../components/EmptyState';
import { useCartStore, cartTotal } from '../lib/cart';
import { getImageUrl, formatCurrency } from '../lib/utils';
import { Minus, Plus, Trash2, ShoppingCart } from 'lucide-react';

export default function CartPage() {
  const { t } = useTranslation();
  const { items, removeItem, updateQuantity } = useCartStore();

  if (items.length === 0) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <EmptyState
            title={t('cart.empty')}
            description={t('cart.emptyDesc')}
            action={
              <Link to="/marketplace" className="btn-primary inline-block">
                {t('cart.continueShopping')}
              </Link>
            }
          />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">{t('cart.title')}</h1>
          <p className="text-gray-600">{t('cart.subtitle')}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Items */}
          <div className="lg:col-span-2 space-y-4">
            {items.map((item) => (
              <div key={item.productId} className="card">
                <div className="flex flex-col sm:flex-row gap-4">
                  <img
                    src={getImageUrl(item.imageUrl)}
                    alt={item.title}
                    className="w-full sm:w-24 h-24 object-cover rounded"
                  />

                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <Link
                          to={`/product/${item.productId}`}
                          className="font-semibold hover:text-primary-600"
                        >
                          {item.title}
                        </Link>
                        {item.artisanName && (
                          <p className="text-sm text-gray-600">
                            {t('marketplace.by')} {item.artisanName}
                          </p>
                        )}
                        <p className="text-sm text-gray-600 mt-1">
                          {formatCurrency(item.unitPrice)}
                          {t('cart.priceEach')}
                        </p>
                      </div>
                      <button
                        onClick={() => removeItem(item.productId)}
                        className="text-red-500 hover:text-red-700 p-1"
                        aria-label={t('cart.remove')}
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center border rounded-lg">
                        <button
                          onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                          className="px-3 py-1.5 hover:bg-gray-100"
                          aria-label={t('cart.decrease')}
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="px-4 py-1.5 min-w-[2.5rem] text-center">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                          className="px-3 py-1.5 hover:bg-gray-100"
                          aria-label={t('cart.increase')}
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                      <span className="font-semibold">
                        {formatCurrency(item.unitPrice * item.quantity)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div>
            <div className="card sticky top-24">
              <h2 className="text-lg font-semibold mb-4">{t('cart.summary')}</h2>
              <div className="flex justify-between text-gray-600 mb-2">
                <span>{t('cart.items')}</span>
                <span>{items.length}</span>
              </div>
              <div className="flex justify-between font-semibold text-lg border-t pt-3 mb-4">
                <span>{t('cart.subtotal')}</span>
                <span>{formatCurrency(cartTotal(items))}</span>
              </div>
              <p className="text-sm text-gray-500 mb-4">{t('cart.checkoutNote')}</p>
              <Link to="/checkout" className="btn-primary w-full block text-center">
                <span className="inline-flex items-center justify-center gap-2">
                  <ShoppingCart className="h-4 w-4" />
                  {t('cart.proceedToCheckout')}
                </span>
              </Link>
              <Link
                to="/marketplace"
                className="btn-outline w-full block text-center mt-3"
              >
                {t('cart.continueShopping')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
