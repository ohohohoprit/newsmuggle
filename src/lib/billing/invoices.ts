/**
 * Invoice service — read model for invoice/payment history.
 *
 * Invoices are created by webhook handlers (when a provider sends an
 * invoice.generated event) or manually by the system. This module
 * provides query functions for the billing/invoices API endpoints.
 */
import { db } from '@/lib/db';
import type { InvoiceDTO, InvoiceStatus } from '@/lib/billing/types';

// ===== Helpers =====

function toDTO(inv: {
  id: string;
  workspaceId: string;
  userId: string | null;
  subscriptionId: string | null;
  amount: number;
  currency: string;
  status: string;
  invoiceNo: string | null;
  description: string | null;
  periodStart: Date | null;
  periodEnd: Date | null;
  provider: string | null;
  providerInvoiceId: string | null;
  providerPaymentId: string | null;
  hostedInvoiceUrl: string | null;
  invoicePdfUrl: string | null;
  paidAt: Date | null;
  attemptCount: number;
  createdAt: Date;
}): InvoiceDTO {
  return {
    id: inv.id,
    workspaceId: inv.workspaceId,
    invoiceNo: inv.invoiceNo,
    amount: inv.amount / 100, // cents → dollars
    currency: inv.currency,
    status: inv.status as InvoiceStatus,
    description: inv.description,
    periodStart: inv.periodStart?.toISOString() ?? null,
    periodEnd: inv.periodEnd?.toISOString() ?? null,
    provider: (inv.provider ?? null) as InvoiceDTO['provider'],
    providerInvoiceId: inv.providerInvoiceId,
    hostedInvoiceUrl: inv.hostedInvoiceUrl,
    invoicePdfUrl: inv.invoicePdfUrl,
    paidAt: inv.paidAt?.toISOString() ?? null,
    createdAt: inv.createdAt.toISOString(),
  };
}

// ===== Public API =====

/** List invoices for a workspace (newest first). */
export async function listInvoices(
  workspaceId: string,
  opts: { limit?: number; offset?: number; status?: InvoiceStatus } = {},
): Promise<{ invoices: InvoiceDTO[]; total: number }> {
  const limit = Math.min(opts.limit ?? 50, 200);
  const offset = opts.offset ?? 0;

  const where: Record<string, unknown> = { workspaceId };
  if (opts.status) where.status = opts.status;

  const [invoices, total] = await Promise.all([
    db.invoice.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    db.invoice.count({ where }),
  ]);

  return {
    invoices: invoices.map(toDTO),
    total,
  };
}

/** Get a single invoice by id (verifying workspace access). */
export async function getInvoice(invoiceId: string, workspaceId: string): Promise<InvoiceDTO | null> {
  const inv = await db.invoice.findUnique({
    where: { id: invoiceId },
  });
  if (!inv || inv.workspaceId !== workspaceId) return null;
  return toDTO(inv);
}

/** Create an invoice record (called by webhook handlers). */
export async function createInvoice(input: {
  workspaceId: string;
  userId?: string | null;
  subscriptionId?: string | null;
  amount: number; // cents
  currency: string;
  status: InvoiceStatus;
  invoiceNo?: string | null;
  description?: string | null;
  periodStart?: Date | null;
  periodEnd?: Date | null;
  provider?: string | null;
  providerInvoiceId?: string | null;
  providerPaymentId?: string | null;
  hostedInvoiceUrl?: string | null;
  invoicePdfUrl?: string | null;
  paidAt?: Date | null;
}): Promise<InvoiceDTO> {
  // Idempotency: if providerInvoiceId is set, check for existing
  if (input.providerInvoiceId && input.provider) {
    const existing = await db.invoice.findFirst({
      where: {
        provider: input.provider,
        providerInvoiceId: input.providerInvoiceId,
      },
    });
    if (existing) {
      return toDTO(existing);
    }
  }

  const inv = await db.invoice.create({
    data: {
      workspaceId: input.workspaceId,
      userId: input.userId ?? null,
      subscriptionId: input.subscriptionId ?? null,
      amount: input.amount,
      currency: input.currency,
      status: input.status,
      invoiceNo: input.invoiceNo ?? null,
      description: input.description ?? null,
      periodStart: input.periodStart ?? null,
      periodEnd: input.periodEnd ?? null,
      provider: input.provider ?? null,
      providerInvoiceId: input.providerInvoiceId ?? null,
      providerPaymentId: input.providerPaymentId ?? null,
      hostedInvoiceUrl: input.hostedInvoiceUrl ?? null,
      invoicePdfUrl: input.invoicePdfUrl ?? null,
      paidAt: input.paidAt ?? null,
    },
  });

  return toDTO(inv);
}

/** Update an invoice status (e.g. when a payment succeeds). */
export async function updateInvoiceStatus(
  invoiceId: string,
  status: InvoiceStatus,
  opts: { paidAt?: Date; providerPaymentId?: string } = {},
): Promise<InvoiceDTO | null> {
  const inv = await db.invoice.update({
    where: { id: invoiceId },
    data: {
      status,
      ...(opts.paidAt ? { paidAt: opts.paidAt } : {}),
      ...(opts.providerPaymentId ? { providerPaymentId: opts.providerPaymentId } : {}),
    },
  });
  return toDTO(inv);
}
