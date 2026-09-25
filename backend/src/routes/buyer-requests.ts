import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';

const router = express.Router();

// Setup multer for buyer request attachments (images + voice notes)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = path.join(__dirname, '../../uploads');

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp|webm|mpeg|mp3|m4a|wav/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname || mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Only image or audio attachments are allowed'));
    }
  },
});

/** Safely parse a JSON-encoded string column back into a value. */
const parseJson = <T>(value: string | null | undefined, fallback: T): T => {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

/** Shape a BuyerRequest row for the frontend (attachments array + matchedArtisan alias). */
const toClientRequest = (request: any) => ({
  ...request,
  attachments: parseJson<string[]>(request.attachments, []),
  matchedArtisan: request.matchedArtisan ?? request.assignedArtisan ?? undefined,
  extractedRequirements: parseJson<Record<string, unknown>>(request.extractedRequirements, {}),
});

// Create a new buyer request
router.post('/', authenticate, upload.array('attachments', 8), async (req: AuthRequest, res) => {
  try {
    const { description, title = '', category, material, type = 'text', inputMediaUrl } = req.body;
    const buyerId = req.user!.id;

    if (!description) {
      return res.status(400).json({ error: 'Description is required' });
    }

    const quantity = Number(req.body.quantity) || 1;
    const maxBudget = req.body.maxBudget ? Number(req.body.maxBudget) : null;
    const deadline = req.body.deadline ? new Date(req.body.deadline) : null;

    const files = (req.files as Express.Multer.File[] | undefined) ?? [];
    const attachments = files.map((file) => `/uploads/${file.filename}`);

    const request = await prisma.buyerRequest.create({
      data: {
        buyerId,
        title,
        description,
        category: category || null,
        material: material || null,
        quantity,
        maxBudget,
        deadline: deadline && !isNaN(deadline.getTime()) ? deadline : null,
        attachments: JSON.stringify(attachments),
        type,
        inputMediaUrl: inputMediaUrl || attachments[0] || null,
        extractedRequirements: JSON.stringify({}),
        status: 'PENDING',
      },
      include: {
        buyer: {
          select: { id: true, name: true, email: true, phone: true, avatar: true, location: true },
        },
      },
    });

    res.status(201).json(toClientRequest(request));
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
      requests: requests.map(toClientRequest),
      total,
      limit: Number(limit),
      offset: Number(offset),
    });
  } catch (error) {
    console.error('Get buyer requests error:', error);
    res.status(500).json({ error: 'Failed to get buyer requests' });
  }
});

// Public demand board — open buyer requests are visible to everyone (no auth).
// Contact details (email/phone) are deliberately excluded from the public payload.
router.get('/public', async (req, res) => {
  try {
    const { search, category, limit = 30 } = req.query;

    const where: any = { status: { not: 'CLOSED' } };
    if (category) where.category = category;
    if (search) {
      where.OR = [
        { title: { contains: search as string } },
        { description: { contains: search as string } },
      ];
    }

    const requests = await prisma.buyerRequest.findMany({
      where,
      take: Number(limit),
      orderBy: { createdAt: 'desc' },
      include: {
        buyer: { select: { id: true, name: true, location: true, avatar: true } },
        assignedArtisan: { select: { id: true, name: true, craftType: true, location: true, avatar: true } },
      },
    });

    res.json(requests.map(toClientRequest));
  } catch (error) {
    console.error('Get public buyer requests error:', error);
    res.status(500).json({ error: 'Failed to load buyer requests' });
  }
});

// Demand forecast — turns open buyer requests into actionable opportunity data.
// This is the "AI shows artisans where the money is" view on the artisan dashboard.
router.get('/insights/forecast', authenticate, async (req: AuthRequest, res) => {
  try {
    const windowDays = Math.min(Math.max(Number(req.query.days) || 30, 7), 180);
    const now = new Date();
    const windowEnd = new Date(now.getTime() + windowDays * 24 * 60 * 60 * 1000);

    const openRequests = await prisma.buyerRequest.findMany({
      where: { status: { not: 'CLOSED' } },
      select: {
        id: true,
        title: true,
        category: true,
        quantity: true,
        maxBudget: true,
        deadline: true,
        createdAt: true,
        buyer: { select: { name: true, location: true } },
      },
    });

    // Requests with no deadline are always "in window" — they are live demand.
    const inWindow = openRequests.filter((r) => !r.deadline || r.deadline <= windowEnd);
    const estimatedValue = inWindow.reduce((sum, r) => sum + (r.maxBudget ?? 0), 0);

    const categoryMap = new Map<string, { category: string; requests: number; quantity: number; estimatedValue: number }>();
    const locationMap = new Map<string, number>();

    for (const request of inWindow) {
      const category = request.category || 'Other';
      const entry = categoryMap.get(category) ?? { category, requests: 0, quantity: 0, estimatedValue: 0 };
      entry.requests += 1;
      entry.quantity += request.quantity ?? 1;
      entry.estimatedValue += request.maxBudget ?? 0;
      categoryMap.set(category, entry);

      if (request.buyer?.location) {
        locationMap.set(request.buyer.location, (locationMap.get(request.buyer.location) ?? 0) + 1);
      }
    }

    const closingSoon = openRequests
      .filter((r) => r.deadline && r.deadline >= now && r.deadline <= windowEnd)
      .sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime())
      .slice(0, 5)
      .map((r) => ({
        id: r.id,
        title: r.title,
        category: r.category,
        deadline: r.deadline,
        maxBudget: r.maxBudget,
        quantity: r.quantity,
      }));

    res.json({
      windowDays,
      totalOpen: openRequests.length,
      inWindow: inWindow.length,
      estimatedValue,
      byCategory: [...categoryMap.values()].sort((a, b) => b.estimatedValue - a.estimatedValue),
      topLocations: [...locationMap.entries()]
        .map(([location, requests]) => ({ location, requests }))
        .sort((a, b) => b.requests - a.requests)
        .slice(0, 5),
      closingSoon,
    });
  } catch (error) {
    console.error('Demand forecast error:', error);
    res.status(500).json({ error: 'Failed to build demand forecast' });
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

    res.json(toClientRequest(request));
  } catch (error) {
    console.error('Get buyer request error:', error);
    res.status(500).json({ error: 'Failed to get buyer request' });
  }
});

// Update buyer request status (PUT + PATCH for client compatibility)
const updateStatusHandler = async (req: AuthRequest, res: express.Response) => {
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
};

router.put('/:id/status', authenticate, updateStatusHandler);
router.patch('/:id/status', authenticate, updateStatusHandler);

// Request artisan matching
router.post('/:id/match', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const buyerId = req.user!.id;

    const request = await prisma.buyerRequest.findFirst({
      where: { id, buyerId },
      include: { buyer: true },
    });

    if (!request) {
      return res.status(404).json({ error: 'Buyer request not found' });
    }

    if (!['PENDING', 'MATCHED'].includes(request.status)) {
      return res.status(400).json({ error: 'Request is not in a matchable status' });
    }

    const { understandRequirementsService, findArtisanMatchesService } = await import('../lib/aiService.js');

    // Reuse previously extracted requirements, otherwise derive them from the description
    const stored = parseJson<Record<string, unknown>>(request.extractedRequirements, {});
    const requirements: Record<string, any> = Object.keys(stored).length > 0
      ? { ...stored }
      : (understandRequirementsService(request.description) as unknown as Record<string, any>);

    // Merge in the structured form fields so matching can use them too
    if (request.category && !requirements.craftType) requirements.craftType = request.category;
    if (request.material && !requirements.material) requirements.material = request.material;
    if (request.maxBudget && !requirements.budget) requirements.budget = request.maxBudget;
    if (request.quantity && !requirements.quantity) requirements.quantity = request.quantity;

    await prisma.buyerRequest.update({
      where: { id },
      data: { extractedRequirements: JSON.stringify(requirements) },
    });

    // Candidate artisans for deterministic scoring
    const artisans = await prisma.user.findMany({
      where: { role: 'ARTISAN' },
      select: { id: true, name: true, avatar: true, location: true, craftType: true, rating: true, bio: true },
    });

    const matches = findArtisanMatchesService(requirements as any, artisans);

    // Refresh suggestions: clear previous ones, then store the best 5
    await prisma.artisanMatch.deleteMany({ where: { buyerRequestId: id, status: 'SUGGESTED' } });

    const createdMatches = await Promise.all(
      matches.slice(0, 5).map(async (match) => {
        return prisma.artisanMatch.create({
          data: {
            buyerRequestId: id,
            buyerId,
            artisanId: match.artisanId,
            matchScore: match.matchScore,
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

    // Mark the request as matched when suggestions exist
    const updated = await prisma.buyerRequest.update({
      where: { id },
      data: { status: createdMatches.length > 0 ? 'MATCHED' : 'PENDING' },
      include: {
        buyer: { select: { id: true, name: true, email: true, phone: true, avatar: true, location: true } },
        assignedArtisan: { select: { id: true, name: true, avatar: true, craftType: true, location: true, rating: true } },
      },
    });

    res.json({ matches: createdMatches, request: toClientRequest(updated) });
  } catch (error) {
    console.error('Request artisan matching error:', error);
    res.status(500).json({ error: 'Failed to request artisan matching' });
  }
});

export default router;
