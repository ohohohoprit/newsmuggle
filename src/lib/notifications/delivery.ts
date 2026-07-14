/**
 * Notification delivery service — handles delivering notifications
 * through multiple channels: in_app, email, webhook.
 *
 * Each channel is a separate NotificationDelivery row with its own
 * status + retry schedule. If a channel isn't configured (no email
 * provider, no webhook URL), the delivery is marked as 'skipped'
 * with a clear status.
 *
 * Retry strategy: exponential backoff (1m, 5m, 15m) for failed deliveries.
 * The retry-failed cron job picks up deliveries with nextAttemptAt <= now
 * and status = 'pending' or 'failed'.
 */
import { db } from '@/lib/db';
import type { DeliveryChannel, DeliveryStatus } from '@/lib/notifications/types';

const MAX_ATTEMPTS = 3;
const RETRY_DELAYS_MS = [60 * 1000, 5 * 60 * 1000, 15 * 60 * 1000]; // 1m, 5m, 15m

// ===== Public API =====

/**
 * Create a delivery record + attempt to deliver immediately.
 * Called by the notification service after creating a notification.
 */
export async function deliverNotification(
  notificationId: string,
  channel: DeliveryChannel,
): Promise<{ deliveryId: string; status: DeliveryStatus }> {
  // Check if delivery already exists (idempotent)
  const existing = await db.notificationDelivery.findFirst({
    where: { notificationId, channel },
  });
  if (existing && (existing.status === 'sent' || existing.status === 'skipped')) {
    return { deliveryId: existing.id, status: existing.status as DeliveryStatus };
  }

  // Create or update the delivery record
  const delivery = await db.notificationDelivery.upsert({
    where: { id: existing?.id ?? 'nonexistent' },
    update: {
      status: 'pending',
      attemptCount: 0,
      errorMessage: null,
    },
    create: {
      notificationId,
      channel,
      status: 'pending',
      maxAttempts: MAX_ATTEMPTS,
    },
  });

  // Attempt delivery
  const result = await attemptDelivery(delivery.id, channel, notificationId);

  return { deliveryId: delivery.id, status: result };
}

/**
 * Attempt to deliver a notification through a channel.
 * Updates the delivery record with the result.
 */
async function attemptDelivery(
  deliveryId: string,
  channel: DeliveryChannel,
  notificationId: string,
): Promise<DeliveryStatus> {
  const notification = await db.notification.findUnique({
    where: { id: notificationId },
    include: {
      user: { select: { email: true } },
    },
  });

  if (!notification) {
    await markDeliveryFailed(deliveryId, 'Notification not found');
    return 'failed';
  }

  const attemptCount = await incrementAttempt(deliveryId);
  const now = new Date();

  try {
    let status: DeliveryStatus;
    let recipient: string | null = null;
    let providerMessageId: string | null = null;
    let errorMessage: string | null = null;

    switch (channel) {
      case 'in_app':
        // In-app delivery is a no-op — the notification row IS the delivery.
        // Just mark as sent.
        status = 'sent';
        break;

      case 'email':
        const emailResult = await sendEmail({
          to: notification.user.email,
          subject: notification.title,
          body: notification.message,
          priority: notification.priority,
        });
        status = emailResult.status;
        recipient = emailResult.recipient;
        providerMessageId = emailResult.providerMessageId;
        errorMessage = emailResult.errorMessage;
        break;

      case 'webhook':
        const webhookResult = await sendWebhook({
          notificationId,
          userId: notification.userId,
          workspaceId: notification.workspaceId,
          type: notification.type,
          category: notification.category,
          priority: notification.priority,
          title: notification.title,
          message: notification.message,
          metadata: notification.metadata,
        });
        status = webhookResult.status;
        recipient = webhookResult.recipient;
        providerMessageId = webhookResult.providerMessageId;
        errorMessage = webhookResult.errorMessage;
        break;

      default:
        status = 'skipped';
        errorMessage = `Unknown channel: ${channel}`;
    }

    // Update the delivery record
    if (status === 'sent') {
      await db.notificationDelivery.update({
        where: { id: deliveryId },
        data: {
          status: 'sent',
          recipient,
          providerMessageId,
          sentAt: now,
          lastAttemptAt: now,
          errorMessage: null,
        },
      });
    } else if (status === 'skipped') {
      await db.notificationDelivery.update({
        where: { id: deliveryId },
        data: {
          status: 'skipped',
          recipient,
          errorMessage,
          lastAttemptAt: now,
        },
      });
    } else {
      // failed — schedule retry if attempts remain
      await scheduleRetry(deliveryId, attemptCount, errorMessage ?? 'Delivery failed');
    }

    return status;
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Delivery failed';
    await scheduleRetry(deliveryId, attemptCount, errorMessage);
    return 'failed';
  }
}

async function incrementAttempt(deliveryId: string): Promise<number> {
  const delivery = await db.notificationDelivery.update({
    where: { id: deliveryId },
    data: {
      attemptCount: { increment: 1 },
      lastAttemptAt: new Date(),
    },
  });
  return delivery.attemptCount;
}

async function markDeliveryFailed(deliveryId: string, errorMessage: string): Promise<void> {
  await db.notificationDelivery.update({
    where: { id: deliveryId },
    data: { status: 'failed', errorMessage },
  });
}

async function scheduleRetry(deliveryId: string, attemptCount: number, errorMessage: string): Promise<void> {
  if (attemptCount >= MAX_ATTEMPTS) {
    await db.notificationDelivery.update({
      where: { id: deliveryId },
      data: {
        status: 'failed',
        errorMessage,
        nextAttemptAt: null,
      },
    });
    return;
  }

  const delay = RETRY_DELAYS_MS[attemptCount - 1] ?? RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1];
  await db.notificationDelivery.update({
    where: { id: deliveryId },
    data: {
      status: 'pending',
      errorMessage,
      nextAttemptAt: new Date(Date.now() + delay),
    },
  });
}

/**
 * Retry pending/failed deliveries that have a nextAttemptAt <= now.
 * Called by the delivery_retry cron job.
 */
export async function retryPendingDeliveries(limit = 100): Promise<{ retried: number; succeeded: number; failed: number }> {
  const pending = await db.notificationDelivery.findMany({
    where: {
      status: 'pending',
      nextAttemptAt: { lte: new Date() },
      attemptCount: { lt: MAX_ATTEMPTS },
    },
    take: limit,
    orderBy: { nextAttemptAt: 'asc' },
  });

  let succeeded = 0;
  let failed = 0;

  for (const delivery of pending) {
    const result = await attemptDelivery(delivery.id, delivery.channel as DeliveryChannel, delivery.notificationId);
    if (result === 'sent') succeeded++;
    else if (result === 'failed') failed++;
  }

  return { retried: pending.length, succeeded, failed };
}

// ===== Email delivery =====

interface EmailResult {
  status: DeliveryStatus;
  recipient: string | null;
  providerMessageId: string | null;
  errorMessage: string | null;
}

/**
 * Send an email notification. Uses the configured email provider.
 * If no provider is configured, marks as 'skipped'.
 *
 * Supported env vars (set one):
 *   - SMTP_URL           (e.g. smtps://user:pass@smtp.gmail.com:465)
 *   - RESEND_API_KEY     (Resend.com transactional email)
 *   - SENDGRID_API_KEY   (SendGrid)
 */
async function sendEmail(opts: { to: string | null; subject: string; body: string; priority: string }): Promise<EmailResult> {
  if (!opts.to) {
    return { status: 'skipped', recipient: null, providerMessageId: null, errorMessage: 'No email address on user' };
  }

  // Check if any email provider is configured
  const smtpUrl = process.env.SMTP_URL;
  const resendKey = process.env.RESEND_API_KEY;
  const sendgridKey = process.env.SENDGRID_API_KEY;

  if (!smtpUrl && !resendKey && !sendgridKey) {
    return {
      status: 'skipped',
      recipient: opts.to,
      providerMessageId: null,
      errorMessage: 'No email provider configured (set SMTP_URL, RESEND_API_KEY, or SENDGRID_API_KEY)',
    };
  }

  // Resend.com integration (preferred for simplicity)
  if (resendKey) {
    try {
      const from = process.env.EMAIL_FROM ?? 'notifications@contentsmuggler.app';
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from,
          to: opts.to,
          subject: opts.subject,
          text: opts.body,
        }),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        return { status: 'failed', recipient: opts.to, providerMessageId: null, errorMessage: `Resend API error: ${errText}` };
      }

      const data = (await res.json()) as { id?: string };
      return { status: 'sent', recipient: opts.to, providerMessageId: data.id ?? null, errorMessage: null };
    } catch (err) {
      return { status: 'failed', recipient: opts.to, providerMessageId: null, errorMessage: err instanceof Error ? err.message : 'Resend fetch failed' };
    }
  }

  // SendGrid integration
  if (sendgridKey) {
    try {
      const from = process.env.EMAIL_FROM ?? 'notifications@contentsmuggler.app';
      const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${sendgridKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: opts.to }] }],
          from: { email: from },
          subject: opts.subject,
          content: [{ type: 'text/plain', value: opts.body }],
        }),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        return { status: 'failed', recipient: opts.to, providerMessageId: null, errorMessage: `SendGrid API error: ${errText}` };
      }

      // SendGrid returns 202 with no body; message ID is in headers
      const messageId = res.headers.get('x-message-id');
      return { status: 'sent', recipient: opts.to, providerMessageId: messageId, errorMessage: null };
    } catch (err) {
      return { status: 'failed', recipient: opts.to, providerMessageId: null, errorMessage: err instanceof Error ? err.message : 'SendGrid fetch failed' };
    }
  }

  // SMTP integration would require nodemailer — deferred
  return {
    status: 'skipped',
    recipient: opts.to,
    providerMessageId: null,
    errorMessage: 'SMTP provider not yet wired (install nodemailer)',
  };
}

// ===== Webhook delivery =====

interface WebhookResult {
  status: DeliveryStatus;
  recipient: string | null;
  providerMessageId: string | null;
  errorMessage: string | null;
}

/**
 * Send a webhook notification. If no webhook URL is configured for the
 * workspace, marks as 'skipped'.
 *
 * Env vars:
 *   - NOTIFICATION_WEBHOOK_URL  (global webhook URL; per-workspace overrides via settings)
 */
async function sendWebhook(payload: Record<string, unknown>): Promise<WebhookResult> {
  const webhookUrl = process.env.NOTIFICATION_WEBHOOK_URL;
  if (!webhookUrl) {
    return {
      status: 'skipped',
      recipient: null,
      providerMessageId: null,
      errorMessage: 'No webhook URL configured (set NOTIFICATION_WEBHOOK_URL)',
    };
  }

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      return {
        status: 'failed',
        recipient: webhookUrl,
        providerMessageId: null,
        errorMessage: `Webhook returned status ${res.status}`,
      };
    }

    return { status: 'sent', recipient: webhookUrl, providerMessageId: null, errorMessage: null };
  } catch (err) {
    return {
      status: 'failed',
      recipient: webhookUrl,
      providerMessageId: null,
      errorMessage: err instanceof Error ? err.message : 'Webhook fetch failed',
    };
  }
}
