import express from 'express';
import { prisma } from '../lib/prisma.js';
import { notify } from '../lib/notifications.js';
import { authenticate, AuthRequest, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Get enquiries (based on role)
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const where: any = {};

    if (req.user!.role === 'ARTISAN') {
      // Artisans see enquiries for their products
      const products = await prisma.product.findMany({
        where: { artisanId: req.user!.id },
        select: { id: true },
      });
      where.productId = { in: products.map(p => p.id) };
    } else if (req.user!.role === 'BUYER') {
      // Buyers see their own enquiries
      where.buyerId = req.user!.id;
    }
    // Admins see all enquiries

    const enquiries = await prisma.enquiry.findMany({
      where,
      include: {
        product: {
          select: {
            id: true,
            title: true,
            imageUrl: true,
            suggestedPrice: true,
            artisan: {
              select: {
                id: true,
                name: true,
                location: true,
              },
            },
          },
        },
        buyer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(enquiries);
  } catch (error) {
    console.error('Get enquiries error:', error);
    res.status(500).json({ error: 'Failed to fetch enquiries' });
  }
});

// Create enquiry (buyer only)
router.post('/', authenticate, requireRole('BUYER'), async (req: AuthRequest, res) => {
  try {
    const { productId, quantity, message } = req.body;

    if (!productId || !message) {
      return res.status(400).json({ error: 'Product ID and message are required' });
    }

    // Verify product exists and is approved
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    if (product.status !== 'APPROVED') {
      return res.status(400).json({ error: 'Product is not available for enquiry' });
    }

    const enquiry = await prisma.enquiry.create({
      data: {
        productId,
        buyerId: req.user!.id,
        quantity: parseInt(quantity) || 1,
        message,
      },
      include: {
        product: {
          select: {
            id: true,
            title: true,
            imageUrl: true,
            suggestedPrice: true,
          },
        },
        buyer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    // Tell the artisan that a buyer is interested in their product
    const productOwner = await prisma.product.findUnique({
      where: { id: productId },
      select: { artisanId: true, title: true },
    });

    if (productOwner) {
      await notify({
        userId: productOwner.artisanId,
        type: 'ENQUIRY_RECEIVED',
        title: 'New enquiry received',
        body: `A buyer enquired about "${productOwner.title}"`,
        link: '/enquiries',
      });
    }

    res.status(201).json(enquiry);
  } catch (error) {
    console.error('Create enquiry error:', error);
    res.status(500).json({ error: 'Failed to create enquiry' });
  }
});

// Update enquiry status (artisan or admin)
router.patch('/:id', authenticate, requireRole('ARTISAN', 'ADMIN'), async (req: AuthRequest, res) => {
  try {
    const { status } = req.body;

    const enquiry = await prisma.enquiry.findUnique({
      where: { id: req.params.id },
      include: {
        product: true,
      },
    });

    if (!enquiry) {
      return res.status(404).json({ error: 'Enquiry not found' });
    }

    // Artisans can only update their own product's enquiries
    if (req.user!.role === 'ARTISAN' && enquiry.product.artisanId !== req.user!.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const updatedEnquiry = await prisma.enquiry.update({
      where: { id: req.params.id },
      data: { status },
      include: {
        product: {
          select: {
            id: true,
            title: true,
          },
        },
        buyer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    res.json(updatedEnquiry);
  } catch (error) {
    console.error('Update enquiry error:', error);
    res.status(500).json({ error: 'Failed to update enquiry' });
  }
});

export default router;