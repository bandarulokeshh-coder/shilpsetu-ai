import express from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticate, AuthRequest, requireRole } from '../middleware/auth.js';

const router = express.Router();

// All admin routes require admin role
router.use(authenticate);
router.use(requireRole('ADMIN'));

// Get dashboard stats
router.get('/stats', async (req: AuthRequest, res) => {
  try {
    const [
      totalArtisans,
      totalBuyers,
      totalProducts,
      approvedProducts,
      pendingProducts,
      totalEnquiries,
    ] = await Promise.all([
      prisma.user.count({ where: { role: 'ARTISAN' } }),
      prisma.user.count({ where: { role: 'BUYER' } }),
      prisma.product.count(),
      prisma.product.count({ where: { status: 'APPROVED' } }),
      prisma.product.count({ where: { status: 'PENDING' } }),
      prisma.enquiry.count(),
    ]);

    const productsWithPrice = await prisma.product.findMany({
      where: { suggestedPrice: { not: null } },
      select: { suggestedPrice: true },
    });

    const estimatedSales = productsWithPrice.reduce(
      (sum, p) => sum + (p.suggestedPrice || 0),
      0
    );

    const recentProducts = await prisma.product.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        artisan: {
          select: { name: true, location: true },
        },
      },
    });

    const recentEnquiries = await prisma.enquiry.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        product: { select: { title: true } },
        buyer: { select: { name: true } },
      },
    });

    res.json({
      stats: {
        totalArtisans,
        totalBuyers,
        totalProducts,
        approvedProducts,
        pendingProducts,
        totalEnquiries,
        estimatedSales,
      },
      recentProducts,
      recentEnquiries,
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Get all users (artisans)
router.get('/users', async (req: AuthRequest, res) => {
  try {
    const { role, isApproved, search } = req.query;

    const where: any = {};

    if (role) {
      where.role = role;
    }

    if (isApproved !== undefined) {
      where.isApproved = isApproved === 'true';
    }

    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { email: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        location: true,
        craftType: true,
        isApproved: true,
        createdAt: true,
        _count: {
          select: { products: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Approve/reject artisan
router.patch('/users/:id/approve', async (req: AuthRequest, res) => {
  try {
    const { isApproved } = req.body;

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { isApproved },
      select: {
        id: true,
        name: true,
        email: true,
        isApproved: true,
      },
    });

    res.json(user);
  } catch (error) {
    console.error('Approve user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Get all products (including pending)
router.get('/products', async (req: AuthRequest, res) => {
  try {
    const { status } = req.query;

    const where: any = {};
    if (status) {
      where.status = status;
    }

    const products = await prisma.product.findMany({
      where,
      include: {
        artisan: {
          select: {
            id: true,
            name: true,
            email: true,
            location: true,
          },
        },
        _count: {
          select: { enquiries: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(products);
  } catch (error) {
    console.error('Get all products error:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// Approve/reject product
router.patch('/products/:id/status', async (req: AuthRequest, res) => {
  try {
    const { status } = req.body;

    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: { status },
      include: {
        artisan: {
          select: { name: true, email: true },
        },
      },
    });

    res.json(product);
  } catch (error) {
    console.error('Update product status error:', error);
    res.status(500).json({ error: 'Failed to update product status' });
  }
});

export default router;