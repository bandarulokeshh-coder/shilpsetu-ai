import express from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = express.Router();

// Get current user profile
router.get('/me', authenticate, async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        preferredLanguage: true,
        location: true,
        craftType: true,
        bio: true,
        avatar: true,
        createdAt: true,
        isApproved: true,
        rating: true,
        verifiedAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get additional stats based on role
    let stats: any = {};

    if (user.role === 'ARTISAN') {
      const productCount = await prisma.product.count({
        where: { artisanId: user.id },
      });
      const enquiryCount = await prisma.enquiry.count({
        where: {
          product: { artisanId: user.id },
        },
      });

      const products = await prisma.product.findMany({
        where: { artisanId: user.id },
        select: { suggestedPrice: true },
      });

      const totalEarnings = products.reduce((sum, p) => sum + (p.suggestedPrice || 0), 0);

      stats = {
        productCount,
        enquiryCount,
        estimatedEarnings: totalEarnings,
      };
    }

    res.json({ ...user, stats });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Submit identity for verification (artisan only).
// Only the last 4 digits are stored — the full number is never persisted.
router.post('/me/verification', authenticate, async (req: AuthRequest, res) => {
  try {
    if (req.user!.role !== 'ARTISAN') {
      return res.status(403).json({ error: 'Only artisans can be verified' });
    }

    const { idType, idNumber } = req.body;
    if (!idType || !idNumber || String(idNumber).length < 4) {
      return res.status(400).json({ error: 'idType and a valid idNumber are required' });
    }

    const digits = String(idNumber).replace(/\D/g, '') || String(idNumber);

    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        idType,
        idLast4: digits.slice(-4),
        verifiedAt: new Date(),
        isApproved: true,
      },
      select: {
        id: true,
        name: true,
        role: true,
        isApproved: true,
        rating: true,
        verifiedAt: true,
        idType: true,
        idLast4: true,
      },
    });

    res.json({ user });
  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({ error: 'Failed to submit verification' });
  }
});

// Update current user profile
router.put('/me', authenticate, async (req: AuthRequest, res) => {
  try {
    const { name, phone, preferredLanguage, location, craftType, bio, avatar } = req.body;

    const updatedUser = await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        ...(name && { name }),
        ...(phone !== undefined && { phone }),
        ...(preferredLanguage && { preferredLanguage }),
        ...(location !== undefined && { location }),
        ...(craftType !== undefined && { craftType }),
        ...(bio !== undefined && { bio }),
        ...(avatar !== undefined && { avatar }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        preferredLanguage: true,
        location: true,
        craftType: true,
        bio: true,
        avatar: true,
      },
    });

    res.json(updatedUser);
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Change password
router.put('/password', authenticate, async (req: AuthRequest, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new password are required' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isValidPassword = await bcrypt.compare(currentPassword, user.password);

    if (!isValidPassword) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: req.user!.id },
      data: { password: hashedPassword },
    });

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// Get artisan profile (public)
router.get('/artisan/:id', async (req, res) => {
  try {
    const artisan = await prisma.user.findUnique({
      where: { id: req.params.id, role: 'ARTISAN' },
      select: {
        id: true,
        name: true,
        location: true,
        craftType: true,
        bio: true,
        avatar: true,
        createdAt: true,
        isApproved: true,
        rating: true,
        verifiedAt: true,
      },
    });

    if (!artisan) {
      return res.status(404).json({ error: 'Artisan not found' });
    }

    const products = await prisma.product.findMany({
      where: { artisanId: artisan.id, status: 'APPROVED' },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    res.json({ ...artisan, products });
  } catch (error) {
    console.error('Get artisan error:', error);
    res.status(500).json({ error: 'Failed to fetch artisan' });
  }
});

export default router;