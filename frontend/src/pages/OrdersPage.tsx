import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Layout from '../components/Layout';
import Loading from '../components/Loading';
import EmptyState from '../components/EmptyState';
import { ordersApi, Order } from '../lib/api';
import { useAuthStore } from '../lib/store';
import { getImageUrl, formatCurrency, formatDate } from '../lib/utils';
import { ClipboardList, XCircle } from 'lucide-react';
import ShipmentEvents from '../components/ShipmentEvents';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

const TRACKING_STEPS = ['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED'] as const;

const STATUS_STYLES: Record<Order['status'], string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  CONFIRMED: 'bg-blue-100 text-blue-800',
  SHIPPED: 'bg-indigo-100 text-indigo-800',
  DELIVERED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

const NEXT_ACTION: Partial<Record<Order['status'], Order['status']>> = {
  PENDING: 'CONFIRMED',
  CONFIRMED: 'SHIPPED',
  SHIPPED: 'DELIVERED',
};

function TrackingStepper({ order }: { order: Order }) {
  const { t } = useTranslation();
  const currentIndex =
    order.status === 'CANCELLED'
      ? -1
      : TRACKING_STEPS.indexOf(order.status as (typeof TRACKING_STEPS)[number]);

  return (
    <div className="flex items-center w-full mt-4 mb-1">
      {TRACKING_STEPS.map((step, index) => {
        const done = index <= currentIndex;
        return (
          <div key={step} className={`flex items-center ${index > 0 ? 'flex-1' : ''}`}>
            {index > 0 && (
              <div className={`flex-1 h-1 mx-1 ${index <= currentIndex ? 'bg-primary-600' : 'bg-gray-200'}`} />
            )}
            <div className="flex flex-col items-center">
              <div
                className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                  done ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-500'
                }`}
              >
                {index + 1}
              </div>
              <span className={`text-xs mt-1 ${done ? 'text-primary-700 font-medium' : 'text-gray-500'}`}>
                {t(`orders.step.${step}`)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function OrdersPage() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      const response = await ordersApi.getAll();
      setOrders(response.data);
    } catch (error) {
      toast.error(t('orders.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, status: Order['status']) => {
    setBusyId(id);
    try {
      await ordersApi.updateStatus(id, status);
      toast.success(t('orders.statusUpdated'));
      loadOrders();
    } catch (error: any) {
      toast.error(error.response?.data?.error || t('orders.updateFailed'));
    } finally {
      setBusyId(null);
    }
  };

  const cancelOrder = async (id: string) => {
    if (!window.confirm(t('orders.cancelConfirm'))) return;
    setBusyId(id);
    try {
      await ordersApi.cancel(id);
      toast.success(t('orders.cancelled'));
      loadOrders();
    } catch (error: any) {
      toast.error(error.response?.data?.error || t('orders.updateFailed'));
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <Layout>
        <Loading>{t('common.loading')}</Loading>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">{t('orders.title')}</h1>
          <p className="text-gray-600">{t('orders.subtitle')}</p>
        </div>

        {orders.length === 0 ? (
          <EmptyState
            title={t('orders.empty')}
            description={t('orders.emptyDesc')}
            action={
              <Link to="/marketplace" className="btn-primary inline-block">
                {t('cart.continueShopping')}
              </Link>
            }
          />
        ) : (
          <div className="space-y-6">
            {orders.map((order) => {
              const nextStatus = NEXT_ACTION[order.status];
              const canAdvance =
                nextStatus && (user?.role === 'ADMIN' || user?.role === 'ARTISAN');
              const canCancel = user?.role === 'BUYER' && order.status === 'PENDING';

              return (
                <div key={order.id} className="card">
                  {/* Header */}
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2 text-gray-600 text-sm">
                      <ClipboardList className="h-4 w-4" />
                      <span>{t('orders.orderNo')} #{order.id.slice(0, 8).toUpperCase()}</span>
                      <span>·</span>
                      <span>{t('orders.placedOn')} {formatDate(order.createdAt)}</span>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm ${STATUS_STYLES[order.status]}`}>
                      {t(`orders.status.${order.status}`)}
                    </span>
                  </div>

                  {/* Tracking */}
                  {order.status === 'CANCELLED' ? (
                    <div className="flex items-center gap-2 text-red-600 text-sm mb-2">
                      <XCircle className="h-4 w-4" />
                      {t('orders.cancelledNote')}
                    </div>
                  ) : (
                    <TrackingStepper order={order} />
                  )}

                  <ShipmentEvents orderId={order.id} />

                  {/* Items */}
                  <ul className="divide-y mt-3">
                    {order.items.map((item) => (
                      <li key={item.id} className="flex gap-3 py-3">
                        <img
                          src={getImageUrl(item.imageUrl)}
                          alt={item.title}
                          className="w-16 h-16 object-cover rounded flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium">{item.title}</p>
                          <p className="text-sm text-gray-600">
                            {t('orders.soldBy')}: {item.artisanName}
                          </p>
                          <p className="text-sm text-gray-600">
                            {item.quantity} × {formatCurrency(item.unitPrice)}
                          </p>
                        </div>
                        <span className="font-medium whitespace-nowrap">
                          {formatCurrency(item.unitPrice * item.quantity)}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {/* Shipping + totals + actions */}
                  <div className="border-t pt-3 flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div className="text-sm text-gray-600">
                      <p className="font-medium text-gray-800 mb-1">{t('orders.shippingTo')}</p>
                      <p>{order.shippingName} · {order.shippingPhone}</p>
                      <p>{order.shippingAddress}</p>
                      <p>{order.shippingCity} — {order.shippingPincode}</p>
                    </div>

                    <div className="text-right">
                      <p className="text-sm text-gray-600">{t('orders.total')}</p>
                      <p className="text-xl font-bold">{formatCurrency(order.totalAmount)}</p>
                      <div className="flex gap-2 justify-end mt-2">
                        {canCancel && (
                          <button
                            onClick={() => cancelOrder(order.id)}
                            disabled={busyId === order.id}
                            className="btn-outline text-red-600 border-red-300 hover:bg-red-50 text-sm disabled:opacity-60"
                          >
                            {t('orders.cancel')}
                          </button>
                        )}
                        {canAdvance && nextStatus && (
                          <button
                            onClick={() => updateStatus(order.id, nextStatus)}
                            disabled={busyId === order.id}
                            className="btn-primary text-sm disabled:opacity-60"
                          >
                            {t(`orders.mark.${nextStatus}`)}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
