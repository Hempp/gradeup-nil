import type { DealStatus, DealType, CompensationType } from '@/types';

// ═══════════════════════════════════════════════════════════════════════════
// DEAL COMPONENT TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface BrandInfo {
  name: string;
  logo: string | null;
  contactName: string;
  contactEmail: string;
}

export interface TimelineItem {
  date: string;
  event: string;
}

export type DeliverableStatus = 'pending' | 'submitted' | 'approved' | 'rejected';

export interface Deliverable {
  id: string;
  title: string;
  description: string;
  status: DeliverableStatus;
  dueDate: string;
  submittedAt: string | null;
  approvedAt: string | null;
}

export interface DealMessage {
  id: string;
  senderId: 'brand' | 'athlete';
  senderName: string;
  senderAvatar: string | null;
  message: string;
  timestamp: string;
}

export interface DealDetail {
  id: string;
  title: string;
  description: string;
  brand: BrandInfo;
  amount: number;
  status: DealStatus;
  dealType: DealType;
  compensationType: CompensationType;
  createdAt: string;
  expiresAt: string;
  acceptedAt: string | null;
  withdrawnAt?: string | null;
  withdrawnReason?: string | null;
  keyTerms: string[];
  timeline: TimelineItem[];
  deliverables: Deliverable[];
  messages: DealMessage[];
  contractUrl: string | null;
}

export interface CounterOfferFormData {
  amount: string;
  notes: string;
}

export interface CounterOfferFormErrors {
  amount?: string;
  notes?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

export type Tab = 'overview' | 'deliverables' | 'messages' | 'contract';

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Check if a deal has expired based on its expiration date
 */
export function isDealExpired(expiresAt: string): boolean {
  return new Date(expiresAt) < new Date();
}

/**
 * Get the number of days until expiration (negative if expired)
 */
export function getDaysUntilExpiration(expiresAt: string): number {
  const now = new Date();
  const expiry = new Date(expiresAt);
  const diffTime = expiry.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Validate counter offer form
 */
export function validateCounterOffer(formData: CounterOfferFormData): CounterOfferFormErrors {
  const errors: CounterOfferFormErrors = {};

  const amount = parseFloat(formData.amount);
  if (!formData.amount.trim()) {
    errors.amount = 'Amount is required';
  } else if (isNaN(amount) || amount <= 0) {
    errors.amount = 'Please enter a valid amount greater than 0';
  } else if (amount > 1000000) {
    errors.amount = 'Amount cannot exceed $1,000,000';
  }

  if (formData.notes && formData.notes.length > 1000) {
    errors.notes = 'Notes cannot exceed 1000 characters';
  }

  return errors;
}
