import express from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';
import { notify } from '../lib/notifications.js';

const router = express.Router();

const REVIEWER_SELECT = { id: true, name: true, avatar: true } as const;

const average = (ratings: number[]): number | null =>
  ratings.length
    ? Math.round((ratings.reduce((sum, value) => sum + value, 0) / ratings.length) * 10) / 10
    : null;

// Reviews for a product (public)
router.get('/products/:productId', async (req, res) => {
  try {
    const reviews = await prisma.review.findMany({
      where: { productId: req.params.productId },
      orderBy: { createdAt: 'desc' },
      include: { buyer: { select: REVIEWER_SELECT } },
    });

    res.json({
      reviews,
      total: reviews.length,
      averageRating: average(reviews.map((review) => review.rating)),
    });
  } catch (error) {
    console.error('Get product reviews error:', error);
    res.status(500).json({ error: 'Failed to load reviews' });
  }
});

// Reviews received by an artisan (public)
router.get('/artisans/:artisanId', async (req, res) => {
  try {
    const reviews = await prisma.review.findMany({
      where: { artisanId: req.params.artisanId },
      orderBy: { createdAt: 'desc' },
      include: {
        buyer: { select: REVIEWER_SELECT },
        product: { select: { id: true, title: true, imageUrl: true } },
      },
    });

    res.json({
      reviews,
      total: reviews.length,
      averageRating: average(reviews.map((review) => review.rating)),
    });
  } catch (error) {
    console.error('Get artisan reviews error:', error);
    res.status(500).json({ error: 'Failed to load reviews' });
  }
});

// Leave a review (buyer only, one per product)
router.post('/', authenticate, async (req: AuthRequest, res) => {
  try {
    if (req.user!.role !== 'BUYER') {
      return res.status(403).json({ error: 'Only buyers can leave a review' });
    }

    const { productId, rating, comment } = req.body;
    const stars = Number(rating);

    if (!productId || !Number.isInteger(stars) || stars < 1 || stars > 5) {
      return res.status(400).json({ error: 'productId and a rating between 1 and 5 are required' });
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, title: true, artisanId: true },
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    if (product.artisanId === req.user!.id) {
      return res.status(400).json({ error: 'You cannot review your own product' });
    }

    const existing = await prisma.review.findUnique({
      where: { productId_buyerId: { productId, buyerId: req.user!.id } },
    });

    if (existing) {
      return res.status(400).json({ error: 'You have already reviewed this product' });
    }

    const review = await prisma.review.create({
      data: {
        productId,
        buyerId: req.user!.id,
        artisanId: product.artisanId,
        rating: stars,
        comment: comment?.trim() || null,
      },
      include: { buyer: { select: REVIEWER_SELECT } },
    });

    // Keep the artisan's aggregate rating current for the matching score + profile
    const aggregate = await prisma.review.aggregate({
      where: { artisanId: product.artisanId },
      _avg: { rating: true },
      _count: { rating: true },
    });

    await prisma.user.update({
      where: { id: product.artisanId },
      data: { rating: aggregate._avg.rating ?? null },
    });

    await notify({
      userId: product.artisanId,
      type: 'REVIEW_RECEIVED',
      title: 'New review received',
      body: `A buyer rated "${product.title}" ${stars} star${stars > 1 ? 's' : ''}`,
      link: `/artisan/${product.artisanId}`,
    });

    res.status(201).json(review);
  } catch (error) {
    console.error('Create review error:', error);
    res.status(500).json({ error: 'Failed to submit review' });
  }
});

export default router;