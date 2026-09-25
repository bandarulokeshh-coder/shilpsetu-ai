import express from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticate, AuthRequest, requireRole } from '../middleware/auth.js';

const router = express.Router();

export const ORDER_STATUSES = ['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED'] as const;

const ORDER_INCLUDE = {
  buyer: {
    select: { id: true, name: true, email: true, phone: true },
  },
  items: true,
} as const;

// Get orders (based on role, mirrors the enquiries route)
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const where: any = {};

    if (req.user!.role === 'ARTISAN') {
      // Artisans see orders that contain their products
      where.items = { some: { artisanId: req.user!.id } };
    } else if (req.user!.role === 'BUYER') {
      // Buyers see their own orders
      where.buyerId = req.user!.id;
    }
    // Admins see all orders

    const orders = await prisma.order.findMany({
      where,
      include: ORDER_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });

    res.json(orders);
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Create order / checkout (buyer only)
router.post('/', authenticate, requireRole('BUYER'), async (req: AuthRequest, res) => {
  try {
    const { items, shipping } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Cart is empty' });
    }

    const { name, phone, address, city, pincode } = shipping || {};
    if (!name || !phone || !address || !city || !pincode) {
      return res.status(400).json({ error: 'Shipping address is incomplete' });
    }

    // Validate cart lines and load products server-side (prices are never trusted from the client)
    const productIds = items.map((i: any) => String(i?.productId));
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      include: { artisan: { select: { id: true, name: true } } },
    });
    const productMap = new Map(products.map((p) => [p.id, p]));

    const lines = [];
    for (const item of items) {
      const product = productMap.get(String(item?.productId));
      if (!product) {
        return res.status(400).json({ error: `Product not found: ${item?.productId}` });
      }
      if (product.status !== 'APPROVED') {
        return res.status(400).json({ error: `"${product.title}" is not available for purchase` });
      }
      const quantity = Math.max(1, parseInt(item?.quantity) || 1);
      const unitPrice = product.suggestedPrice ?? product.premiumPrice ?? product.minimumPrice ?? 0;
      lines.push({ product, quantity, unitPrice });
    }

    const totalAmount = lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);

    const order = await prisma.order.create({
      data: {
        buyerId: req.user!.id,
        totalAmount,
        shippingName: String(name),
        shippingPhone: String(phone),
        shippingAddress: String(address),
        shippingCity: String(city),
        shippingPincode: String(pincode),
        items: {
          create: lines.map((l) => ({
            productId: l.product.id,
            artisanId: l.product.artisanId,
            artisanName: l.product.artisan.name,
            title: l.product.title,
            imageUrl: l.product.enhancedImageUrl || l.product.imageUrl || null,
            unitPrice: l.unitPrice,
            quantity: l.quantity,
          })),
        },
      },
      include: ORDER_INCLUDE,
    });

    res.status(201).json(order);
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ error: 'Failed to place order' });
  }
});

// Get a single order
router.get('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: ORDER_INCLUDE,
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const isBuyer = order.buyerId === req.user!.id;
    const isAdmin = req.user!.role === 'ADMIN';
    const isSeller = order.items.some((i) => i.artisanId === req.user!.id);

    if (!isBuyer && !isAdmin && !isSeller) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    res.json(order);
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// Update order status (artisan who owns an item, or admin)
router.patch('/:id/status', authenticate, requireRole('ARTISAN', 'ADMIN'), async (req: AuthRequest, res) => {
  try {
    const { status } = req.body;

    if (!ORDER_STATUSES.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Allowed: ${ORDER_STATUSES.join(', ')}` });
    }

    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: { items: { select: { artisanId: true } } },
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Artisans can only update orders that contain their own products
    if (req.user!.role === 'ARTISAN' && !order.items.some((i) => i.artisanId === req.user!.id)) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const updated = await prisma.order.update({
      where: { id: req.params.id },
      data: { status },
      include: ORDER_INCLUDE,
    });

    res.json(updated);
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ error: 'Failed to update order' });
  }
});

// Cancel order (buyer only, only while still PENDING)
router.patch('/:id/cancel', authenticate, requireRole('BUYER'), async (req: AuthRequest, res) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: { items: { select: { artisanId: true } } },
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.buyerId !== req.user!.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    if (order.status !== 'PENDING') {
      return res.status(400).json({ error: 'Only pending orders can be cancelled' });
    }

    const updated = await prisma.order.update({
      where: { id: req.params.id },
      data: { status: 'CANCELLED' },
      include: ORDER_INCLUDE,
    });

    res.json(updated);
  } catch (error) {
    console.error('Cancel order error:', error);
    res.status(500).json({ error: 'Failed to cancel order' });
  }
});

export default router;
