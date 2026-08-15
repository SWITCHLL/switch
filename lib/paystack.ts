/**
 * Paystack API client — server-side only.
 * Wraps the Paystack REST API with typed helpers for the operations we need.
 * Docs: https://paystack.com/docs/api
 */
import 'server-only'

const PAYSTACK_BASE = 'https://api.paystack.co'

function secretKey(): string {
  const key = process.env.PAYSTACK_SECRET_KEY
  if (!key) throw new Error('PAYSTACK_SECRET_KEY is not configured')
  return key
}

async function paystackRequest<T>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  path: string,
  body?: Record<string, unknown>
): Promise<T> {
  const res = await fetch(`${PAYSTACK_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${secretKey()}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
    // Never cache Paystack requests
    cache: 'no-store',
  })

  const json = (await res.json()) as { status: boolean; message: string; data: T }

  if (!res.ok || !json.status) {
    throw new Error(`Paystack ${method} ${path} failed: ${json.message}`)
  }

  return json.data
}

// ─── Transaction types ────────────────────────────────────────────────────────

export interface PaystackInitResult {
  authorization_url: string
  access_code: string
  reference: string
}

export interface PaystackVerifyResult {
  id: number
  reference: string
  status: 'success' | 'failed' | 'abandoned' | string
  amount: number // in kobo
  currency: string
  paid_at: string
  customer: { email: string; id: number }
  authorization: { authorization_code: string; bank: string; last4: string; card_type: string }
  metadata?: Record<string, unknown>
}

export interface PaystackRefundResult {
  id: number
  transaction: number
  amount: number
  status: string
}

// ─── Recipient / Transfer types ───────────────────────────────────────────────

export interface PaystackRecipient {
  recipient_code: string
  id: number
  type: string
  name: string
  account_number: string
  bank_code: string
}

export interface PaystackTransferResult {
  transfer_code: string
  id: number
  amount: number
  status: string
}

export interface PaystackBankAccount {
  account_number: string
  account_name: string
  bank_id: number
}

// ─── API methods ──────────────────────────────────────────────────────────────

export const paystack = {
  /**
   * Initialize a transaction — returns authorization_url to redirect the user.
   */
  async initializeTransaction(params: {
    email: string
    amount: number // in kobo
    reference: string
    metadata?: Record<string, unknown>
    callback_url?: string
  }): Promise<PaystackInitResult> {
    return paystackRequest('POST', '/transaction/initialize', params)
  },

  /**
   * Verify a transaction by reference — call this in the webhook or callback.
   */
  async verifyTransaction(reference: string): Promise<PaystackVerifyResult> {
    return paystackRequest('GET', `/transaction/verify/${encodeURIComponent(reference)}`)
  },

  /**
   * Refund a transaction.
   * amount is optional — if omitted, full amount is refunded.
   */
  async refundTransaction(params: {
    transaction: string // Paystack transaction id or reference
    amount?: number // partial refund in kobo
    merchant_note?: string
  }): Promise<PaystackRefundResult> {
    return paystackRequest('POST', '/refund', params)
  },

  /**
   * Verify a bank account number — returns account name.
   * Used when organizer saves their bank details.
   */
  async verifyBankAccount(params: {
    account_number: string
    bank_code: string
  }): Promise<PaystackBankAccount> {
    return paystackRequest(
      'GET',
      `/bank/resolve?account_number=${params.account_number}&bank_code=${params.bank_code}`
    )
  },

  /**
   * Create a transfer recipient (organizer's bank account).
   */
  async createTransferRecipient(params: {
    type: 'nuban'
    name: string
    account_number: string
    bank_code: string
    currency?: string
  }): Promise<PaystackRecipient> {
    return paystackRequest('POST', '/transferrecipient', {
      ...params,
      currency: params.currency ?? 'NGN',
    })
  },

  /**
   * Initiate a transfer to a recipient.
   * Requires Transfers to be enabled on your Paystack account.
   */
  async initiateTransfer(params: {
    source: 'balance'
    amount: number // in kobo
    recipient: string // recipient_code
    reason?: string
    reference?: string
  }): Promise<PaystackTransferResult> {
    return paystackRequest('POST', '/transfer', params)
  },

  /**
   * Verify webhook signature — call this before processing any webhook.
   */
  verifyWebhookSignature(body: string, signature: string): Promise<boolean> {
    const secret = process.env.PAYSTACK_WEBHOOK_SECRET
    if (!secret) return Promise.resolve(false)

    return import('crypto').then(({ createHmac }) => {
      const hash = createHmac('sha512', secret).update(body).digest('hex')
      return hash === signature
    })
  },

  /**
   * List banks (Nigeria).
   */
  async listBanks(): Promise<Array<{ name: string; code: string; id: number }>> {
    return paystackRequest('GET', '/bank?country=nigeria&use_cursor=false&perPage=100')
  },
}
