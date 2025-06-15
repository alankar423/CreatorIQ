// Subscription and billing types

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number; // in cents
  currency: string;
  interval: 'month' | 'year';
  features: PlanFeature[];
  limits: PlanLimits;
  isPopular?: boolean;
  stripePriceId: string;
}

export interface PlanFeature {
  id: string;
  name: string;
  description: string;
  included: boolean;
  limit?: number;
}

export interface PlanLimits {
  monthlyAnalyses: number; // -1 for unlimited
  exportFormats: string[];
  apiAccess: boolean;
  prioritySupport: boolean;
  advancedAnalytics: boolean;
}

export interface UserSubscription {
  id: string;
  userId: string;
  planId: string;
  status: SubscriptionStatus;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  stripeSubscriptionId: string;
  stripeCustomerId: string;
  createdAt: string;
  updatedAt: string;
}

export enum SubscriptionStatus {
  ACTIVE = 'ACTIVE',
  PAST_DUE = 'PAST_DUE',
  UNPAID = 'UNPAID',
  CANCELLED = 'CANCELLED',
  INCOMPLETE = 'INCOMPLETE',
  INCOMPLETE_EXPIRED = 'INCOMPLETE_EXPIRED',
  TRIALING = 'TRIALING'
}

export interface BillingInfo {
  customerId: string;
  paymentMethod?: {
    id: string;
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
  };
  billingAddress?: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
}

export interface Invoice {
  id: string;
  amount: number;
  currency: string;
  status: 'draft' | 'open' | 'paid' | 'uncollectible' | 'void';
  created: string;
  dueDate?: string;
  paidAt?: string;
  invoiceUrl: string;
  downloadUrl: string;
}

export interface UsageMetrics {
  currentPeriod: {
    analysesUsed: number;
    analysesLimit: number;
    periodStart: string;
    periodEnd: string;
  };
  historicalUsage: Array<{
    month: string;
    analysesCount: number;
    cost: number;
  }>;
}

export interface SubscriptionChangePreview {
  currentPlan: SubscriptionPlan;
  newPlan: SubscriptionPlan;
  prorationAmount: number; // in cents
  nextBillingDate: string;
  effectiveDate: string;
}
