import express from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// Create a new buyer request
router.post('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const { description, type = 'text', inputMediaUrl, extractedRequirements } = req.body;
    const buyerId = req.user!.id;

    const request = await prisma.buyerRequest.create({
      data: {
        buyerId,
        description,
        type,
        inputMediaUrl,
        extractedRequirements: extractedRequirements || {},
        status: 'PENDING',
      },
      include: {
        buyer: {
          select: { id: true, name: true, email: true, phone: true, avatar: true, location: true },
        },
      },
    });

    res.status(201).json(request);
  } catch (error) {
    console.error('Create buyer request error:', error);
    res.status(500).json({ error: 'Failed to create buyer request' });
  }
});

// Get all buyer requests for the current user
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const buyerId = req.user!.id;
    const { status, limit = 20, offset = 0 } = req.query;

    const where: any = { buyerId };
    if (status) where.status = status;

    const [requests, total] = await Promise.all([
      prisma.buyerRequest.findMany({
        where,
        skip: Number(offset),
        take: Number(limit),
        include: {
          buyer: {
            select: { id: true, name: true, avatar: true, location: true },
          },
          assignedArtisan: {
            select: { id: true, name: true, avatar: true, craftType: true, location: true, rating: true },
          },
          quotes: {
            where: { status: { in: ['PENDING', 'ACCEPTED'] } },
            include: {
              artisan: { select: { id: true, name: true, avatar: true, craftType: true } },
            },
          },
          artisanMatches: {
            where: { status: 'SUGGESTED' },
            include: { artisan: { select: { id: true, name: true, avatar: true, craftType: true } } },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.buyerRequest.count({ where }),
    ]);

    res.json({
      requests,
      total,
      limit: Number(limit),
      offset: Number(offset),
    });
  } catch (error) {
    console.error('Get buyer requests error:', error);
    res.status(500).json({ error: 'Failed to get buyer requests' });
  }
});

// Get a specific buyer request
router.get('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const buyerId = req.user!.id;

    const request = await prisma.buyerRequest.findFirst({
      where: { id, buyerId },
      include: {
        buyer: { select: { id: true, name: true, email: true, phone: true, avatar: true, location: true } },
        assignedArtisan: {
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
            isApproved: true,
          },
        },
        quotes: {
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
        },
        artisanMatches: {
          where: { status: { in: ['SUGGESTED', 'ACCEPTED'] } },
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
                products: { take: 5, select: { id: true, title: true, imageUrl: true, suggestedPrice: true } },
              },
            },
          },
        },
        conversations: {
          where: {},
          include: {
            sender: { select: { id: true, name: true, avatar: true } },
            receiver: { select: { id: true, name: true, avatar: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!request) {
      return res.status(404).json({ error: 'Buyer request not found' });
    }

    res.json(request);
  } catch (error) {
    console.error('Get buyer request error:', error);
    res.status(500).json({ error: 'Failed to get buyer request' });
  }
});

// Update buyer request status
router.put('/:id/status', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const buyerId = req.user!.id;
    const { status } = req.body;

    const request = await prisma.buyerRequest.findFirst({
      where: { id, buyerId },
    });

    if (!request) {
      return res.status(404).json({ error: 'Buyer request not found' });
    }

    const allowedStatuses = ['PENDING', 'MATCHED', 'QUOTE_RECEIVED', 'ORDER_CREATED', 'CLOSED'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const updated = await prisma.buyerRequest.update({
      where: { id },
      data: { status },
      include: {
        buyer: { select: { id: true, name: true, avatar: true, location: true } },
        assignedArtisan: { select: { id: true, name: true, avatar: true, craftType: true } },
      },
    });

    res.json(updated);
  } catch (error) {
    console.error('Update buyer request status error:', error);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// Request artisan matching
router.post('/:id/match', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const buyerId = req.user!.id;

    const request = await prisma.buyerRequest.findFirst({
      where: { id, buyerId },
    });

    if (!request) {
      return res.status(404).json({ error: 'Buyer request not found' });
    }

    if (request.status !== 'PENDING') {
      return res.status(400).json({ error: 'Request is not in PENDING status' });
    }

    const { extractRequirementsService, matchArtisanService } = await import('../lib/aiService.js');

    // Extract requirements if not already done
    let requirements = request.extractedRequirements;
    if (Object.keys(requirements).length === 0) {
      requirements = extractRequirementsService(request.description, 'en');
      await prisma.buyerRequest.update({
        where: { id },
        data: { extractedRequirements: requirements },
      });
    }

    // Find matching artisans
    const matches = matchArtisanService(
      requirements,
      request.buyer.location,
      requirements.craftType || undefined,
      request.buyer.preferredLanguage || 'en'
    );

    // Create artisan match records
    const createdMatches = await Promise.all(
      matches.map(async (match) => {
        return prisma.artisanMatch.create({
          data: {
            buyerRequestId: id,
            artisanId: match.artisanId,
            matchScore: match.score,
            matchReason: match.reason,
            status: 'SUGGESTED',
          },
          include: {
            artisan: {
              select: {
                id: true,
                name: true,
                avatar: true,
                craftType: true,
                location: true,
                bio: true,
                rating: true,
              },
            },
          },
        });
      })
    );

    res.json({ matches: createdMatches });
  } catch (error) {
    console.error('Request artisan matching error:', error);
    res.status(500).json({ error: 'Failed to request artisan matching' });
  }
});

export default router;
