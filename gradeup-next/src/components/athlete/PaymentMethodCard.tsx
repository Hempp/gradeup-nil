'use client';

import { memo, useState, useRef, useEffect } from 'react';
import { Building2, CreditCard, Smartphone, Mail, MoreVertical, Star, Trash2, Edit2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { maskAccountNumber } from '@/lib/utils/validation';
import type { PaymentAccount, PaymentMethod } from '@/lib/services/payments';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

interface PaymentMethodCardProps {
  account: PaymentAccount;
  onSetPrimary: (id: string) => void;
  onEdit: (account: PaymentAccount) => void;
  onDelete: (id: string) => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// Payment Method Icons & Labels
// ═══════════════════════════════════════════════════════════════════════════

const paymentMethodConfig: Record<PaymentMethod, { icon: typeof Building2; label: string; color: string }> = {
  bank_transfer: {
    icon: Building2,
    label: 'Bank Account',
    color: 'text-blue-500',
  },
  paypal: {
    icon: CreditCard,
    label: 'PayPal',
    color: 'text-[#003087]',
  },
  venmo: {
    icon: Smartphone,
    label: 'Venmo',
    color: 'text-[#3D95CE]',
  },
  check: {
    icon: Mail,
    label: 'Check',
    color: 'text-gray-500',
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// Helper Functions
// ═══════════════════════════════════════════════════════════════════════════

function getDisplayDetails(account: PaymentAccount): string {
  const details = account.account_details;

  switch (account.account_type) {
    case 'bank_transfer':
      if (details.accountNumber) {
        return `${details.bankName || 'Bank'} ****${details.accountNumber.slice(-4)}`;
      }
      return details.bankName || 'Bank Account';

    case 'paypal':
      return details.paypalEmail || 'PayPal Account';

    case 'venmo':
      const username = details.venmoUsername || '';
      return username.startsWith('@') ? username : `@${username}`;

    case 'check':
      if (details.city && details.state) {
        return `${details.city}, ${details.state}`;
      }
      return 'Mailing Address';

    default:
      return 'Payment Account';
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Component (Memoized to prevent unnecessary re-renders)
// ═══════════════════════════════════════════════════════════════════════════

export const PaymentMethodCard = memo(function PaymentMethodCard({
  account,
  onSetPrimary,
  onEdit,
  onDelete,
}: PaymentMethodCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const config = paymentMethodConfig[account.account_type];
  const Icon = config.icon;

  // Close menu on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className={`flex-shrink-0 p-3 rounded-[var(--radius-md)] bg-[var(--bg-tertiary)] ${config.color}`}>
            <Icon className="h-5 w-5" />
          </div>

          {/* Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-[var(--text-primary)]">
                {config.label}
              </span>
              {account.is_primary && (
                <Badge variant="success" size="sm">
                  <Star className="h-3 w-3 mr-1" />
                  Primary
                </Badge>
              )}
              {account.is_verified && (
                <Badge variant="primary" size="sm">Verified</Badge>
              )}
            </div>
            <p className="mt-1 text-sm text-[var(--text-muted)] truncate">
              {getDisplayDetails(account)}
            </p>
          </div>

          {/* Actions Menu */}
          <div className="relative" ref={menuRef}>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => setShowMenu(!showMenu)}
              aria-label="Payment account options"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>

            {showMenu && (
              <div className="absolute right-0 top-full mt-1 w-40 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-[var(--radius-md)] shadow-lg z-10">
                {!account.is_primary && (
                  <button
                    className="w-full px-3 py-2 text-left text-sm text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] flex items-center gap-2"
                    onClick={() => {
                      onSetPrimary(account.id);
                      setShowMenu(false);
                    }}
                  >
                    <Star className="h-4 w-4" />
                    Set as Primary
                  </button>
                )}
                <button
                  className="w-full px-3 py-2 text-left text-sm text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] flex items-center gap-2"
                  onClick={() => {
                    onEdit(account);
                    setShowMenu(false);
                  }}
                >
                  <Edit2 className="h-4 w-4" />
                  Edit
                </button>
                <button
                  className="w-full px-3 py-2 text-left text-sm text-[var(--color-error)] hover:bg-[var(--bg-tertiary)] flex items-center gap-2"
                  onClick={() => {
                    onDelete(account.id);
                    setShowMenu(false);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

PaymentMethodCard.displayName = 'PaymentMethodCard';
