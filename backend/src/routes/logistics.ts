import express from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticate, AuthRequest, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Pickup Location routes

// Get all pickup locations for the authenticated user
router.get('/pickup-locations', authenticate, async (req: AuthRequest, res) => {
  try {
    const locations = await prisma.pickupLocation.findMany({
      where: { artisanId: req.user!.id },
      orderBy: { isDefault: 'desc', createdAt: 'asc' },
    });
    res.json(locations);
  } catch (error) {
    console.error('Get pickup locations error:', error);
    res.status(500).json({ error: 'Failed to fetch pickup locations' });
  }
});

// Create pickup location
router.post('/pickup-locations', authenticate, async (req: AuthRequest, res) => {
  try {
    const { name, addressLine1, addressLine2, city, state, pincode, phone, landmark, isDefault } = req.body;

    const location = await prisma.pickupLocation.create({
      data: {
        artisanId: req.user!.id,
        name: name || 'Primary Pickup',
        addressLine1,
        addressLine2,
        city,
        state,
        pincode,
        phone,
        landmark,
        isDefault: isDefault ?? false,
      },
    });

    res.status(201).json(location);
  } catch (error) {
    console.error('Create pickup location error:', error);
    res.status(500).json({ error: 'Failed to create pickup location' });
  }
});

// Update pickup location
router.put('/pickup-locations/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const location = await prisma.pickupLocation.findFirst({
      where: { id: req.params.id, artisanId: req.user!.id },
    });

    if (!location) {
      return res.status(404).json({ error: 'Pickup location not found' });
    }

    const updated = await prisma.pickupLocation.update({
      where: { id: req.params.id },
      data: req.body,
    });

    res.json(updated);
  } catch (error) {
    console.error('Update pickup location error:', error);
    res.status(500).json({ error: 'Failed to update pickup location' });
  }
});

// Delete pickup location
router.delete('/pickup-locations/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const location = await prisma.pickupLocation.findFirst({
      where: { id: req.params.id, artisanId: req.user!.id },
    });

    if (!location) {
      return res.status(404).json({ error: 'Pickup location not found' });
    }

    await prisma.pickupLocation.delete({
      where: { id: req.params.id },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Delete pickup location error:', error);
    res.status(500).json({ error: 'Failed to delete pickup location' });
  }
});

// Shipment routes

// Get shipments (buyer or artisan perspective)
router.get('/shipments', authenticate, async (req: AuthRequest, res) => {
  try {
    const where: any = {};

    if (req.user!.role === 'ARTISAN') {
      where.artisanId = req.user!.id;
    } else if (req.user!.role === 'BUYER') {
      where.buyerId = req.user!.id;
    }
    // Admins see all shipments

    const shipments = await prisma.shipment.findMany({
      where,
      include: {
        order: true,
        pickupLocation: true,
        address: true,
        events: { orderBy: { timestamp: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(shipments);
  } catch (error) {
    console.error('Get shipments error:', error);
    res.status(500).json({ error: 'Failed to fetch shipments' });
  }
});

// Get single shipment
router.get('/shipments/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const shipment = await prisma.shipment.findUnique({
      where: { id: req.params.id },
      include: {
        order: true,
        buyer: { select: { id: true, name: true, email: true, phone: true } },
        artisan: { select: { id: true, name: true, email: true, phone: true } },
        pickupLocation: true,
        address: true,
        events: { orderBy: { timestamp: 'asc' } },
      },
    });

    if (!shipment) {
      return res.status(404).json({ error: 'Shipment not found' });
    }

    // Authorization check
    const isBuyer = shipment.buyerId === req.user!.id;
    const isArtisan = shipment.artisanId === req.user!.id;
    const isAdmin = req.user!.role === 'ADMIN';

    if (!isBuyer && !isArtisan && !isAdmin) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    res.json(shipment);
  } catch (error) {
    console.error('Get shipment error:', error);
    res.status(500).json({ error: 'Failed to fetch shipment' });
  }
});

// Create shipment (artisan/admin only, after order confirmation)
router.post('/shipments', authenticate, requireRole('ARTISAN', 'ADMIN'), async (req: AuthRequest, res) => {
  try {
    const { orderId, pickupLocationId, trackingId, courierName, shippingCost, weightKg, dimensions, packageCount, scheduledPickupDate, notes } = req.body;

    // Verify order exists and belongs to this artisan or is admin
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (req.user!.role === 'ARTISAN') {
      const artisanOrderItem = await prisma.orderItem.findFirst({
        where: { orderId, artisanId: req.user!.id },
      });
      if (!artisanOrderItem) {
        return res.status(403).json({ error: 'Not authorized for this order' });
      }
    }

    const shipment = await prisma.shipment.create({
      data: {
        orderId,
        buyerId: order.buyerId,
        artisanId: req.user!.id,
        pickupLocationId,
        trackingId,
        courierName,
        shippingCost: shippingCost ?? 0,
        weightKg,
        dimensions,
        packageCount,
        scheduledPickupDate,
        deliveryAddressSnapshot: JSON.stringify({
          name: order.shippingName,
          phone: order.shippingPhone,
          address: order.shippingAddress,
          city: order.shippingCity,
          pincode: order.shippingPincode,
          state: order.shippingState,
          country: order.shippingCountry,
        }),
        notes,
      },
      include: {
        order: true,
        pickupLocation: true,
        address: true,
        events: true,
      },
    });

    res.status(201).json(shipment);
  } catch (error) {
    console.error('Create shipment error:', error);
    res.status(500).json({ error: 'Failed to create shipment' });
  }
});

// Update shipment status
router.patch('/shipments/:id/status', authenticate, async (req: AuthRequest, res) => {
  try {
    const { status } = req.body;

    const shipment = await prisma.shipment.findUnique({
      where: { id: req.params.id },
    });

    if (!shipment) {
      return res.status(404).json({ error: 'Shipment not found' });
    }

    // Authorization check
    const isBuyer = shipment.buyerId === req.user!.id;
    const isArtisan = shipment.artisanId === req.user!.id;
    const isAdmin = req.user!.role === 'ADMIN';

    if (!isBuyer && !isArtisan && !isAdmin) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Create event record
    await prisma.shipmentEvent.create({
      data: {
        shipmentId: req.params.id,
        eventType: status,
        status,
        description: `Status updated to ${status}`,
        notes: `Status updated to ${status}`,
        timestamp: new Date(),
      },
    });

    const updated = await prisma.shipment.update({
      where: { id: req.params.id },
      data: { status, updatedAt: new Date() },
    });

    res.json(updated);
  } catch (error) {
    console.error('Update shipment status error:', error);
    res.status(500).json({ error: 'Failed to update shipment status' });
  }
});

// Get shipment events
router.get('/shipments/:id/events', authenticate, async (req: AuthRequest, res) => {
  try {
    const shipment = await prisma.shipment.findUnique({
      where: { id: req.params.id },
    });

    if (!shipment) {
      return res.status(404).json({ error: 'Shipment not found' });
    }

    // Authorization check
    const isBuyer = shipment.buyerId === req.user!.id;
    const isArtisan = shipment.artisanId === req.user!.id;
    const isAdmin = req.user!.role === 'ADMIN';

    if (!isBuyer && !isArtisan && !isAdmin) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const events = await prisma.shipmentEvent.findMany({
      where: { shipmentId: req.params.id },
      orderBy: { timestamp: 'asc' },
    });

    res.json(events);
  } catch (error) {
    console.error('Get shipment events error:', error);
    res.status(500).json({ error: 'Failed to fetch shipment events' });
  }
});

// Return routes

// Get returns
router.get('/returns', authenticate, async (req: AuthRequest, res) => {
  try {
    const where: any = {};

    if (req.user!.role === 'BUYER') {
      where.buyerId = req.user!.id;
    } else if (req.user!.role === 'ARTISAN') {
      // Artisans can see returns for their products
      where.order = { items: { some: { artisanId: req.user!.id } } };
    }
    // Admins see all returns

    const returns = await prisma.return.findMany({
      where,
      include: {
        shipment: true,
        order: true,
        buyer: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(returns);
  } catch (error) {
    console.error('Get returns error:', error);
    res.status(500).json({ error: 'Failed to fetch returns' });
  }
});

// Create return request (buyer only)
router.post('/returns', authenticate, requireRole('BUYER'), async (req: AuthRequest, res) => {
  try {
    const { shipmentId, orderId, reason, description, refundAmount } = req.body;

    const shipment = await prisma.shipment.findUnique({
      where: { id: shipmentId },
    });

    if (!shipment) {
      return res.status(404).json({ error: 'Shipment not found' });
    }

    if (shipment.buyerId !== req.user!.id) {
      return res.status(403).json({ error: 'Not authorized for this shipment' });
    }

    const returnRequest = await prisma.return.create({
      data: {
        shipmentId,
        orderId,
        buyerId: req.user!.id,
        reason,
        description,
        refundAmount: refundAmount ?? 0,
      },
      include: {
        shipment: true,
        order: true,
      },
    });

    res.status(201).json(returnRequest);
  } catch (error) {
    console.error('Create return error:', error);
    res.status(500).json({ error: 'Failed to create return request' });
  }
});

// Update return status (admin only)
router.patch('/returns/:id/status', authenticate, requireRole('ADMIN'), async (req: AuthRequest, res) => {
  try {
    const { status, refundAmount, refundProcessedAt } = req.body;

    const updated = await prisma.return.update({
      where: { id: req.params.id },
      data: {
        status,
        refundAmount: refundAmount !== undefined ? refundAmount : undefined,
        refundProcessedAt: refundProcessedAt ? new Date(refundProcessedAt) : undefined,
      },
      include: {
        shipment: true,
        order: true,
        buyer: { select: { id: true, name: true, email: true } },
      },
    });

    res.json(updated);
  } catch (error) {
    console.error('Update return status error:', error);
    res.status(500).json({ error: 'Failed to update return status' });
  }
});

// Return shipment routes (for return delivery)
router.get('/return-shipments', authenticate, async (req: AuthRequest, res) => {
  try {
    const where: any = {};

    if (req.user!.role === 'ARTISAN') {
      where.artisanId = req.user!.id;
    } else if (req.user!.role === 'BUYER') {
      where.buyerId = req.user!.id;
    }
    // Admins see all

    const returnShipments = await prisma.shipment.findMany({
      where: {
        returnShipmentId: { not: null },
        ...where,
      },
      include: {
        order: true,
        buyer: { select: { id: true, name: true, email: true, phone: true } },
        artisan: { select: { id: true, name: true, email: true, phone: true } },
        pickupLocation: true,
        address: true,
        events: { orderBy: { timestamp: 'asc' } },
        returnShipment: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(returnShipments);
  } catch (error) {
    console.error('Get return shipments error:', error);
    res.status(500).json({ error: 'Failed to fetch return shipments' });
  }
});

export default router;
