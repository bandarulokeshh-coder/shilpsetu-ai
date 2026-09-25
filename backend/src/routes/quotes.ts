import express from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// Get quotes for the current user (as artisan)
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const artisanId = req.user!.id;
    const { status, limit = 20, offset = 0 } = req.query;

    const where: any = { artisanId };
    if (status) where.status = status;

    const [quotes, total] = await Promise.all([
      prisma.quote.findMany({
        where,
        skip: Number(offset),
        take: Number(limit),
        include: {
          buyerRequest: {
            include: {
              buyer: { select: { id: true, name: true, email: true, phone: true, avatar: true, location: true } },
            },
          },
          artisan: { select: { id: true, name: true, avatar: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.quote.count({ where }),
    ]);

    res.json({
      quotes,
      total,
      limit: Number(limit),
      offset: Number(offset),
    });
  } catch (error) {
    console.error('Get quotes error:', error);
    res.status(500).json({ error: 'Failed to get quotes' });
  }
});

// Get quotes for a specific buyer request (as buyer)
router.get('/request/:requestId', authenticate, async (req: AuthRequest, res) => {
  try {
    const { requestId } = req.params;
    const buyerId = req.user!.id;

    const request = await prisma.buyerRequest.findFirst({
      where: { id: requestId, buyerId },
    });

    if (!request) {
      return res.status(404).json({ error: 'Buyer request not found' });
    }

    const quotes = await prisma.quote.findMany({
      where: { buyerRequestId: requestId },
      include: {
        artisan: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            avatar: true,
            craftType: true,
            location: true,
            bio: true,
            rating: true,
            products: { take: 3, select: { id: true, title: true, imageUrl: true, suggestedPrice: true } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    res.json({ quotes });
  } catch (error) {
    console.error('Get quotes for request error:', error);
    res.status(500).json({ error: 'Failed to get quotes' });
  }
});

// Create a quote (as artisan)
router.post('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const { buyerRequestId, amount, message } = req.body;
    const artisanId = req.user!.id;

    // Check if request exists and belongs to someone else
    const request = await prisma.buyerRequest.findUnique({
      where: { id: buyerRequestId },
      include: { buyer: true },
    });

    if (!request) {
      return res.status(404).json({ error: 'Buyer request not found' });
    }

    if (request.buyerId === artisanId) {
      return res.status(400).json({ error: 'Cannot quote your own request' });
    }

    // Check if artisan already has a quote for this request
    const existingQuote = await prisma.quote.findUnique({
      where: { buyerRequestId_artisanId: { buyerRequestId, artisanId } },
    });

    if (existingQuote) {
      return res.status(400).json({ error: 'Already submitted a quote for this request' });
    }

    // Create quote with 7-day expiry
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 7);

    const quote = await prisma.quote.create({
      data: {
        buyerRequestId,
        artisanId,
        amount,
        message: message || '',
        status: 'PENDING',
        expiryDate,
      },
      include: {
        buyerRequest: {
          include: { buyer: { select: { id: true, name: true, avatar: true } } },
        },
        artisan: { select: { id: true, name: true, avatar: true } },
      },
    });

    res.status(201).json(quote);
  } catch (error) {
    console.error('Create quote error:', error);
    res.status(500).json({ error: 'Failed to create quote' });
  }
});

// Accept a quote (as buyer)
router.patch('/:id/accept', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const buyerId = req.user!.id;

    // Find quote and verify buyer owns the request
    const quote = await prisma.quote.findUnique({
      where: { id },
      include: {
        buyerRequest: {
          include: { buyer: true, assignedArtisan: true },
        },
        artisan: { select: { id: true, name: true } },
      },
    });

    if (!quote) {
      return res.status(404).json({ error: 'Quote not found' });
    }

    if (quote.buyerRequest.buyerId !== buyerId) {
      return res.status(403).json({ error: 'Not authorized to accept this quote' });
    }

    if (quote.status !== 'PENDING') {
      return res.status(400).json({ error: 'Quote is no longer pending' });
    }

    // Check for expiry
    if (new Date() > quote.expiryDate) {
      await prisma.quote.update({
        where: { id },
        data: { status: 'EXPIRED' },
      });
      return res.status(400).json({ error: 'Quote has expired' });
    }

    // Accept the quote
    const acceptedQuote = await prisma.quote.update({
      where: { id },
      data: { status: 'ACCEPTED' },
    });

    // Update buyer request status
    await prisma.buyerRequest.update({
      where: { id: quote.buyerRequestId },
      data: { status: 'QUOTE_RECEIVED', assignedArtisanId: quote.artisanId },
    });

    // Reject all other quotes for this request
    await prisma.quote.updateMany({
      where: {
        buyerRequestId: quote.buyerRequestId,
        id: { not: id },
        status: 'PENDING',
      },
      data: { status: 'REJECTED' },
    });

    res.json(acceptedQuote);
  } catch (error) {
    console.error('Accept quote error:', error);
    res.status(500).json({ error: 'Failed to accept quote' });
  }
});

// Reject a quote (as buyer)
router.patch('/:id/reject', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const buyerId = req.user!.id;

    const quote = await prisma.quote.findUnique({
      where: { id },
      include: { buyerRequest: { include: { buyer: true } } },
    });

    if (!quote) {
      return res.status(404).json({ error: 'Quote not found' });
    }

    if (quote.buyerRequest.buyerId !== buyerId) {
      return res.status(403).json({ error: 'Not authorized to reject this quote' });
    }

    if (quote.status !== 'PENDING') {
      return res.status(400).json({ error: 'Quote is no longer pending' });
    }

    const rejectedQuote = await prisma.quote.update({
      where: { id },
      data: { status: 'REJECTED' },
    });

    res.json(rejectedQuote);
  } catch (error) {
    console.error('Reject quote error:', error);
    res.status(500).json({ error: 'Failed to reject quote' });
  }
});

// Cancel a pending quote (as artisan)
router.patch('/:id/cancel', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const artisanId = req.user!.id;

    const quote = await prisma.quote.findUnique({
      where: { id },
      include: { artisan: true },
    });

    if (!quote) {
      return res.status(404).json({ error: 'Quote not found' });
    }

    if (quote.artisanId !== artisanId) {
      return res.status(403).json({ error: 'Not authorized to cancel this quote' });
    }

    if (quote.status !== 'PENDING') {
      return res.status(400).json({ error: 'Can only cancel pending quotes' });
    }

    const cancelledQuote = await prisma.quote.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });

    res.json(cancelledQuote);
  } catch (error) {
    console.error('Cancel quote error:', error);
    res.status(500).json({ error: 'Failed to cancel quote' });
  }
});

export default router;
