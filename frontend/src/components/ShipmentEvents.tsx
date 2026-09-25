import { useState, useEffect } from 'react';
import { Truck, MapPin } from 'lucide-react';
import { logisticsApi, Shipment } from '../lib/api';

interface ShipmentEventsProps {
  orderId: string;
}

/** Real courier activity for an order, shown underneath the status stepper. */
export default function ShipmentEvents({ orderId }: ShipmentEventsProps) {
  const [shipment, setShipment] = useState<Shipment | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        // The endpoint already embeds each shipment's events.
        const response = await logisticsApi.getShipments();
        const match = response.data.find((item) => item.order?.id === orderId) ?? null;
        if (!cancelled) setShipment(match);
      } catch {
        // Tracking is supplementary — never break the order card over it.
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  if (!shipment) return null;

  const events = shipment.events ?? [];

  return (
    <div className="mt-3 rounded-lg border border-gray-100 bg-gray-50 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <p className="text-sm font-medium text-gray-800 flex items-center gap-2">
          <Truck className="h-4 w-4 text-primary-600" />
          Shipment
          <span className="text-xs font-normal text-gray-600">
            {String(shipment.status).replace(/_/g, ' ').toLowerCase()}
          </span>
        </p>
        {shipment.trackingNumber && (
          <span className="text-xs text-gray-600">
            {shipment.courierName ? `${shipment.courierName} · ` : ''}
            {shipment.trackingNumber}
          </span>
        )}
      </div>

      {events.length === 0 ? (
        <p className="text-xs text-gray-500">No tracking events recorded yet.</p>
      ) : (
        <ol className="space-y-2">
          {[...events].reverse().map((event) => (
            <li key={event.id} className="flex gap-2 text-sm">
              <MapPin className="h-4 w-4 text-primary-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-gray-800">{event.description || event.status || 'Update'}</p>
                <p className="text-xs text-gray-500">
                  {new Date(event.timestamp).toLocaleString()}
                  {event.location ? ` · ${event.location}` : ''}
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}