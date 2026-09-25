import express from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// Start a new conversation message
router.post('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const { buyerRequestId, receiverId, message, language } = req.body;
    const senderId = req.user!.id;

    // Verify buyerRequest exists and sender is involved
    const request = await prisma.buyerRequest.findUnique({
      where: { id: buyerRequestId },
      include: { buyerId: true, assignedArtisanId: true },
    });

    if (!request) {
      return res.status(404).json({ error: 'Buyer request not found' });
    }

    // Verify sender is either the buyer or the assigned artisan
    if (senderId !== request.buyerId && senderId !== request.assignedArtisanId) {
      return res.status(403).json({ error: 'Not authorized to message this request' });
    }

    // Create conversation message
    const conversation = await prisma.conversation.create({
      data: {
        buyerRequestId,
        senderId,
        receiverId,
        message,
        language,
        isTranslated: false,
      },
      include: {
        sender: { select: { id: true, name: true, avatar: true } },
        receiver: { select: { id: true, name: true, avatar: true } },
      },
    });

    // Update buyer request status to conversing
    await prisma.buyerRequest.update({
      where: { id: buyerRequestId },
      data: { status: 'CONVERSING' },
    });

    res.status(201).json(conversation);
  } catch (error) {
    console.error('Create conversation message error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Get conversation thread for a buyer request
router.get('/request/:requestId', authenticate, async (req: AuthRequest, res) => {
  try {
    const { requestId } = req.params;
    const userId = req.user!.id;

    // Verify user has access to this request
    const request = await prisma.buyerRequest.findUnique({
      where: { id: requestId },
      include: { buyerId: true, assignedArtisanId: true },
    });

    if (!request) {
      return res.status(404).json({ error: 'Buyer request not found' });
    }

    if (userId !== request.buyerId && userId !== request.assignedArtisanId) {
      return res.status(403).json({ error: 'Not authorized to view this conversation' });
    }

    const messages = await prisma.conversation.findMany({
      where: { buyerRequestId: requestId },
      include: {
        sender: { select: { id: true, name: true, avatar: true } },
        receiver: { select: { id: true, name: true, avatar: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    res.json({ messages });
  } catch (error) {
    console.error('Get conversation error:', error);
    res.status(500).json({ error: 'Failed to get conversation' });
  }
});

// Get messages between two users for a request
router.get('/request/:requestId/users/:otherUserId', authenticate, async (req: AuthRequest, res) => {
  try {
    const { requestId, otherUserId } = req.params;
    const userId = req.user!.id;

    // Verify both users exist in this request
    const request = await prisma.buyerRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      return res.status(404).json({ error: 'Buyer request not found' });
    }

    const messages = await prisma.conversation.findMany({
      where: {
        buyerRequestId: requestId,
        OR: [
          { senderId: userId, receiverId: otherUserId },
          { senderId: otherUserId, receiverId: userId },
        ],
      },
      include: {
        sender: { select: { id: true, name: true, avatar: true } },
        receiver: { select: { id: true, name: true, avatar: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    res.json({ messages });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Failed to get messages' });
  }
});

// Mark messages as read
router.patch('/:id/read', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const message = await prisma.conversation.findUnique({
      where: { id },
    });

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    if (message.receiverId !== userId) {
      return res.status(403).json({ error: 'Not authorized to mark this message as read' });
    }

    const readMessage = await prisma.conversation.update({
      where: { id },
      data: { isRead: true, readAt: new Date() },
    });

    res.json(readMessage);
  } catch (error) {
    console.error('Mark message as read error:', error);
    res.status(500).json({ error: 'Failed to mark message as read' });
  }
});

export default router;
