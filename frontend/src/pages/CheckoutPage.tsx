import { useState, FormEvent } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Layout from '../components/Layout';
import EmptyState from '../components/EmptyState';
import { useCartStore, cartTotal } from '../lib/cart';
import { ordersApi } from '../lib/api';
import { useAuthStore } from '../lib/store';
import { getImageUrl, formatCurrency } from '../lib/utils';
import toast from 'react-hot-toast';

export default function CheckoutPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { items, clear } = useCartStore();
  const { user, isAuthenticated } = useAuthStore();
  const [submitting, setSubmitting] = useState(false);
  const [shipping, setShipping] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    address: '',
    city: '',
    pincode: '',
  });

  if (items.length === 0 && !submitting) {
    return <Navigate to="/cart" replace />;
  }

  const set = (key: keyof typeof shipping) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setShipping((s) => ({ ...s, [key]: e.target.value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    if (!shipping.name || !shipping.phone || !shipping.address || !shipping.city || !shipping.pincode) {
      toast.error(t('checkout.incompleteAddress'));
      return;
    }

    setSubmitting(true);
    try {
      const response = await ordersApi.create({
        items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        shipping,
      });
      clear();
      toast.success(t('checkout.orderPlaced'));
      navigate('/orders', { state: { placedOrderId: response.data.id } });
    } catch (error: any) {
      toast.error(error.response?.data?.error || t('checkout.failed'));
      setSubmitting(false);
    }
  };

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role !== 'BUYER') {
    return (
      <Layout>
        <div className="max-w-3xl mx-auto px-4 py-8">
          <EmptyState
            title={t('checkout.buyersOnly')}
            description={t('checkout.buyersOnlyDesc')}
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
          <h1 className="text-3xl font-bold mb-2">{t('checkout.title')}</h1>
          <p className="text-gray-600">{t('checkout.subtitle')}</p>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Shipping form */}
          <div className="lg:col-span-2">
            <div className="card">
              <h2 className="text-lg font-semibold mb-4">{t('checkout.shippingSection')}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">{t('checkout.fullName')}</label>
                  <input type="text" className="input" value={shipping.name} onChange={set('name')} required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t('checkout.phone')}</label>
                  <input type="tel" className="input" value={shipping.phone} onChange={set('phone')} required />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium mb-1">{t('checkout.address')}</label>
                  <textarea className="input" rows={3} value={shipping.address} onChange={set('address')} required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t('checkout.city')}</label>
                  <input type="text" className="input" value={shipping.city} onChange={set('city')} required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t('checkout.pincode')}</label>
                  <input
                    type="text"
                    className="input"
                    value={shipping.pincode}
                    onChange={set('pincode')}
                    pattern="[0-9]{6}"
                    title={t('checkout.pincodeHint')}
                    required
                  />
                </div>
              </div>
              <p className="text-sm text-gray-500 mt-4">{t('checkout.codNote')}</p>
            </div>
          </div>

          {/* Order summary */}
          <div>
            <div className="card sticky top-24">
              <h2 className="text-lg font-semibold mb-4">{t('checkout.orderSummary')}</h2>
              <ul className="space-y-3 mb-4">
                {items.map((item) => (
                  <li key={item.productId} className="flex gap-3 text-sm">
                    <img
                      src={getImageUrl(item.imageUrl)}
                      alt={item.title}
                      className="w-12 h-12 object-cover rounded flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{item.title}</p>
                      <p className="text-gray-600">
                        {item.quantity} × {formatCurrency(item.unitPrice)}
                      </p>
                    </div>
                    <span className="font-medium whitespace-nowrap">
                      {formatCurrency(item.unitPrice * item.quantity)}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="flex justify-between font-semibold text-lg border-t pt-3 mb-4">
                <span>{t('checkout.total')}</span>
                <span>{formatCurrency(cartTotal(items))}</span>
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="btn-primary w-full disabled:opacity-60"
              >
                {submitting ? t('checkout.placing') : t('checkout.placeOrder')}
              </button>
              <Link to="/cart" className="btn-outline w-full block text-center mt-3">
                {t('checkout.backToCart')}
              </Link>
            </div>
          </div>
        </form>
      </div>
    </Layout>
  );
}
