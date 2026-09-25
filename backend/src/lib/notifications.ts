import { prisma } from './prisma.js';

export type NotificationType =
  | 'ENQUIRY_RECEIVED'
  | 'QUOTE_RECEIVED'
  | 'QUOTE_ACCEPTED'
  | 'QUOTE_REJECTED'
  | 'REQUEST_MATCHED'
  | 'REVIEW_RECEIVED'
  | 'SHIPMENT_UPDATE';

export interface NotifyInput {
  userId: string | null | undefined;
  type: NotificationType;
  title: string;
  body?: string;
  link?: string;
}

/**
 * Fire-and-forget notification.
 * A failed notification must never fail the action that triggered it, so all
 * errors are swallowed and logged instead of thrown.
 */
export async function notify(input: NotifyInput): Promise<void> {
  try {
    if (!input.userId) return;

    await prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.body ?? null,
        link: input.link ?? null,
      },
    });
  } catch (error) {
    console.error('Failed to create notification:', error);
  }
}