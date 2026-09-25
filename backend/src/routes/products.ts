import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../lib/prisma.js';
import { authenticate, optionalAuth, AuthRequest, requireRole, PRODUCT_STATUSES } from '../middleware/auth.js';
import fs from 'fs/promises';

const router = express.Router();

// Setup multer for image uploads
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
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

// Get all products (public)
router.get('/', async (req, res) => {
  try {
    const {
      category,
      craftType,
      location,
      minPrice,
      maxPrice,
      search,
    } = req.query;

    // The public catalogue is always limited to APPROVED products. Previously an
    // empty `status` value (used by an older dashboard query) returned every
    // artisan's drafts to anonymous callers.
    const where: any = { status: 'APPROVED' };

    if (category) {
      where.category = category;
    }

    if (location) {
      where.artisan = {
        location: {
          contains: location as string,
          mode: 'insensitive',
        },
      };
    }

    if (craftType) {
      where.artisan = {
        ...where.artisan,
        craftType: {
          contains: craftType as string,
          mode: 'insensitive',
        },
      };
    }

    if (search) {
      where.OR = [
        { title: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
        { keywords: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    if (minPrice || maxPrice) {
      where.suggestedPrice = {};
      if (minPrice) where.suggestedPrice.gte = parseFloat(minPrice as string);
      if (maxPrice) where.suggestedPrice.lte = parseFloat(maxPrice as string);
    }

    const products = await prisma.product.findMany({
      where,
      include: {
        artisan: {
          select: {
            id: true,
            name: true,
            location: true,
            craftType: true,
            avatar: true,
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
    console.error('Get products error:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// Get the signed-in artisan's own products (drafts and pending included).
// Registered before '/:id' so that "mine" is never treated as a product id.
router.get('/mine', authenticate, requireRole('ARTISAN', 'ADMIN'), async (req: AuthRequest, res) => {
  try {
    const products = await prisma.product.findMany({
      where: { artisanId: req.user!.id },
      include: {
        artisan: {
          select: {
            id: true,
            name: true,
            location: true,
            craftType: true,
            avatar: true,
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
    console.error('Get own products error:', error);
    res.status(500).json({ error: 'Failed to fetch your products' });
  }
});

// Get single product (public)
router.get('/:id', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
      include: {
        artisan: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            location: true,
            craftType: true,
            bio: true,
            avatar: true,
          },
        },
        _count: {
          select: { enquiries: true },
        },
      },
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Drafts and pending products stay private to their owner and to admins.
    const canSeeUnpublished =
      !!req.user && (req.user.role === 'ADMIN' || req.user.id === product.artisanId);

    if (product.status !== 'APPROVED' && !canSeeUnpublished) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(product);
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// Get artisan's products
router.get('/artisan/:artisanId', async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      where: {
        artisanId: req.params.artisanId,
        status: 'APPROVED',
      },
      include: {
        artisan: {
          select: {
            id: true,
            name: true,
            location: true,
            craftType: true,
            avatar: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(products);
  } catch (error) {
    console.error('Get artisan products error:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// Create product (artisan only)
router.post('/', authenticate, requireRole('ARTISAN'), upload.single('imageUrl'), async (req: AuthRequest, res) => {
  try {
    const {
      title,
      description,
      hindiDescription,
      englishDescription,
      category,
      material,
      dimensions,
      quantity,
      rawMaterialCost,
      labourCost,
      packagingCost,
      otherCost,
      minimumPrice,
      suggestedPrice,
      premiumPrice,
      keywords,
      enhancedImageUrl,
      status,
    } = req.body;

    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

    // "Save draft" sends DRAFT, "Publish" sends APPROVED. A missing or invalid
    // value enters the moderation queue as PENDING.
    const resolvedStatus = (PRODUCT_STATUSES as readonly string[]).includes(status) ? status : 'PENDING';

    const product = await prisma.product.create({
      data: {
        artisanId: req.user!.id,
        title,
        description,
        hindiDescription,
        englishDescription,
        category,
        material,
        dimensions,
        quantity: parseInt(quantity) || 1,
        imageUrl,
        enhancedImageUrl,
        rawMaterialCost: parseFloat(rawMaterialCost) || 0,
        labourCost: parseFloat(labourCost) || 0,
        packagingCost: parseFloat(packagingCost) || 0,
        otherCost: parseFloat(otherCost) || 0,
        minimumPrice: minimumPrice ? parseFloat(minimumPrice) : null,
        suggestedPrice: suggestedPrice ? parseFloat(suggestedPrice) : null,
        premiumPrice: premiumPrice ? parseFloat(premiumPrice) : null,
        keywords,
        status: resolvedStatus,
      },
      include: {
        artisan: {
          select: {
            id: true,
            name: true,
            location: true,
            craftType: true,
          },
        },
      },
    });

    res.status(201).json(product);
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

// Update product (artisan only, own products)
router.put('/:id', authenticate, requireRole('ARTISAN'), upload.single('imageUrl'), async (req: AuthRequest, res) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    if (product.artisanId !== req.user!.id) {
      return res.status(403).json({ error: 'Not authorized to update this product' });
    }

    const {
      title,
      description,
      hindiDescription,
      englishDescription,
      category,
      material,
      dimensions,
      quantity,
      rawMaterialCost,
      labourCost,
      packagingCost,
      otherCost,
      minimumPrice,
      suggestedPrice,
      premiumPrice,
      keywords,
      enhancedImageUrl,
      status,
    } = req.body;

    const imageUrl = req.file ? `/uploads/${req.file.filename}` : undefined;

    const updatedProduct = await prisma.product.update({
      where: { id: req.params.id },
      data: {
        ...(title && { title }),
        ...(description && { description }),
        ...(hindiDescription !== undefined && { hindiDescription }),
        ...(englishDescription !== undefined && { englishDescription }),
        ...(category && { category }),
        ...(material && { material }),
        ...(dimensions !== undefined && { dimensions }),
        ...(quantity && { quantity: parseInt(quantity) }),
        ...(imageUrl && { imageUrl }),
        ...(enhancedImageUrl !== undefined && { enhancedImageUrl }),
        ...(rawMaterialCost !== undefined && { rawMaterialCost: parseFloat(rawMaterialCost) }),
        ...(labourCost !== undefined && { labourCost: parseFloat(labourCost) }),
        ...(packagingCost !== undefined && { packagingCost: parseFloat(packagingCost) }),
        ...(otherCost !== undefined && { otherCost: parseFloat(otherCost) }),
        ...(minimumPrice !== undefined && { minimumPrice: minimumPrice ? parseFloat(minimumPrice) : null }),
        ...(suggestedPrice !== undefined && { suggestedPrice: suggestedPrice ? parseFloat(suggestedPrice) : null }),
        ...(premiumPrice !== undefined && { premiumPrice: premiumPrice ? parseFloat(premiumPrice) : null }),
        ...(keywords !== undefined && { keywords }),
        ...(status && (PRODUCT_STATUSES as readonly string[]).includes(status) && { status }),
      },
      include: {
        artisan: {
          select: {
            id: true,
            name: true,
            location: true,
            craftType: true,
          },
        },
      },
    });

    res.json(updatedProduct);
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// Delete product (artisan only, own products)
router.delete('/:id', authenticate, requireRole('ARTISAN'), async (req: AuthRequest, res) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    if (product.artisanId !== req.user!.id) {
      return res.status(403).json({ error: 'Not authorized to delete this product' });
    }

    await prisma.product.delete({
      where: { id: req.params.id },
    });

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

export default router;
