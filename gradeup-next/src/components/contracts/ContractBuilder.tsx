'use client';

import { useState, useCallback, useMemo } from 'react';
import {
  FileText,
  Plus,
  Trash2,
  GripVertical,
  ChevronDown,
  ChevronUp,
  Save,
  Send,
  Eye,
  AlertCircle,
  CheckCircle2,
  Loader2,
  User,
  Building2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { FormField, TextAreaField, CheckboxField } from '@/components/ui/form-field';
import type {
  ContractClause,
  SignatureParty,
  ContractTemplate,
  CreateContractInput,
} from '@/lib/validations/contract.schema';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface ContractBuilderProps {
  dealId: string;
  dealTitle?: string;
  athleteName?: string;
  athleteEmail?: string;
  brandName?: string;
  brandEmail?: string;
  defaultCompensation?: number;
  onSave?: (data: CreateContractInput) => Promise<void>;
  onSend?: (data: CreateContractInput) => Promise<void>;
  onPreview?: (data: Partial<CreateContractInput>) => void;
  isLoading?: boolean;
  className?: string;
}

interface FormErrors {
  title?: string;
  compensation_amount?: string;
  effective_date?: string;
  expiration_date?: string;
  parties?: string;
  clauses?: string;
  [key: string]: string | undefined;
}

// ═══════════════════════════════════════════════════════════════════════════
// TEMPLATE OPTIONS
// ═══════════════════════════════════════════════════════════════════════════

const templateOptions: Array<{ value: ContractTemplate; label: string; description: string }> = [
  {
    value: 'standard_endorsement',
    label: 'Standard Endorsement',
    description: 'General endorsement agreement for NIL partnerships',
  },
  {
    value: 'social_media_campaign',
    label: 'Social Media Campaign',
    description: 'For sponsored posts and social media content',
  },
  {
    value: 'appearance_agreement',
    label: 'Appearance Agreement',
    description: 'For in-person appearances and events',
  },
  {
    value: 'merchandise_licensing',
    label: 'Merchandise Licensing',
    description: 'For product licensing and merchandise deals',
  },
  {
    value: 'autograph_session',
    label: 'Autograph Session',
    description: 'For autograph signing events',
  },
  {
    value: 'camp_participation',
    label: 'Camp Participation',
    description: 'For sports camps and training events',
  },
  {
    value: 'custom',
    label: 'Custom Contract',
    description: 'Build a custom contract from scratch',
  },
];

// Default clauses for new contracts
const defaultClauses: ContractClause[] = [
  {
    id: '1',
    title: 'Agreement',
    content: 'This Agreement is entered into between the Brand and the Athlete as identified in this contract.',
    is_required: true,
    is_editable: false,
    order: 0,
  },
  {
    id: '2',
    title: 'Compensation',
    content: 'The Brand agrees to pay the Athlete the compensation amount specified in this contract for the services rendered.',
    is_required: true,
    is_editable: true,
    order: 1,
  },
  {
    id: '3',
    title: 'NCAA Compliance',
    content: 'Both parties agree to comply with all applicable NCAA rules and regulations regarding Name, Image, and Likeness (NIL) activities.',
    is_required: true,
    is_editable: false,
    order: 2,
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// HELPER COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

function ClauseEditor({
  clause,
  index,
  onUpdate,
  onRemove,
  canRemove,
}: {
  clause: ContractClause;
  index: number;
  onUpdate: (index: number, clause: ContractClause) => void;
  onRemove: (index: number) => void;
  canRemove: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="border border-[var(--border-color)] rounded-lg overflow-hidden bg-[var(--bg-primary)]">
      <div className="flex items-center gap-2 p-3 bg-[var(--bg-secondary)]">
        <GripVertical className="w-4 h-4 text-[var(--text-muted)] cursor-grab" />
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex-1 flex items-center justify-between text-left"
          aria-expanded={isExpanded}
        >
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-[var(--text-primary)]">
              {clause.title || `Clause ${index + 1}`}
            </span>
            {clause.is_required && (
              <span className="text-xs text-[var(--warning-600)] bg-[var(--warning-100)] px-1.5 py-0.5 rounded">
                Required
              </span>
            )}
          </div>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-[var(--text-muted)]" />
          ) : (
            <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" />
          )}
        </button>
        {canRemove && (
          <button
            onClick={() => onRemove(index)}
            className="p-1.5 text-[var(--text-muted)] hover:text-[var(--color-error)] transition-colors"
            aria-label="Remove clause"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {isExpanded && (
        <div className="p-4 space-y-4">
          <FormField
            label="Clause Title"
            value={clause.title}
            onChange={(e) => onUpdate(index, { ...clause, title: e.target.value })}
            placeholder="Enter clause title"
            disabled={!clause.is_editable && clause.is_required}
          />

          <TextAreaField
            label="Clause Content"
            value={clause.content}
            onChange={(e) => onUpdate(index, { ...clause, content: e.target.value })}
            placeholder="Enter clause content"
            disabled={!clause.is_editable && clause.is_required}
            showCount
            maxLength={5000}
          />

          <div className="flex items-center gap-4">
            <CheckboxField
              label="Required clause"
              checked={clause.is_required}
              onChange={(e) => onUpdate(index, { ...clause, is_required: e.target.checked })}
              disabled={!clause.is_editable}
            />
            <CheckboxField
              label="Editable by parties"
              checked={clause.is_editable}
              onChange={(e) => onUpdate(index, { ...clause, is_editable: e.target.checked })}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function PartyEditor({
  party,
  index,
  onUpdate,
  onRemove,
  canRemove,
  type,
}: {
  party: Partial<SignatureParty>;
  index: number;
  onUpdate: (index: number, party: Partial<SignatureParty>) => void;
  onRemove: (index: number) => void;
  canRemove: boolean;
  type: 'athlete' | 'brand' | 'guardian' | 'witness';
}) {
  const Icon = type === 'brand' ? Building2 : User;
  const typeLabels: Record<string, string> = {
    athlete: 'Athlete',
    brand: 'Brand Representative',
    guardian: 'Parent/Guardian',
    witness: 'Witness',
  };

  return (
    <div className="border border-[var(--border-color)] rounded-lg p-4 bg-[var(--bg-secondary)]">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center">
            <Icon className="w-4 h-4 text-[var(--text-muted)]" />
          </div>
          <span className="text-sm font-medium text-[var(--text-primary)]">
            {typeLabels[type]}
          </span>
        </div>
        {canRemove && (
          <button
            onClick={() => onRemove(index)}
            className="p-1.5 text-[var(--text-muted)] hover:text-[var(--color-error)] transition-colors"
            aria-label="Remove party"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          label="Full Name"
          value={party.name || ''}
          onChange={(e) => onUpdate(index, { ...party, name: e.target.value })}
          placeholder="Enter full name"
          required
        />
        <FormField
          label="Email"
          type="email"
          value={party.email || ''}
          onChange={(e) => onUpdate(index, { ...party, email: e.target.value })}
          placeholder="Enter email address"
          required
        />
        {type === 'brand' && (
          <FormField
            label="Title/Position"
            value={party.title || ''}
            onChange={(e) => onUpdate(index, { ...party, title: e.target.value })}
            placeholder="e.g., Marketing Director"
          />
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export function ContractBuilder({
  dealId,
  dealTitle,
  athleteName,
  athleteEmail,
  brandName,
  brandEmail,
  defaultCompensation = 0,
  onSave,
  onSend,
  onPreview,
  isLoading = false,
  className,
}: ContractBuilderProps) {
  // Form state
  const [template, setTemplate] = useState<ContractTemplate>('standard_endorsement');
  const [title, setTitle] = useState(dealTitle ? `${dealTitle} - Contract` : '');
  const [description, setDescription] = useState('');
  const [effectiveDate, setEffectiveDate] = useState('');
  const [expirationDate, setExpirationDate] = useState('');
  const [compensationAmount, setCompensationAmount] = useState(defaultCompensation);
  const [compensationTerms, setCompensationTerms] = useState('');
  const [deliverablesSummary, setDeliverablesSummary] = useState('');
  const [customTerms, setCustomTerms] = useState('');
  const [requiresGuardian, setRequiresGuardian] = useState(false);
  const [requiresWitness, setRequiresWitness] = useState(false);

  const [clauses, setClauses] = useState<ContractClause[]>(defaultClauses);
  const [parties, setParties] = useState<Array<Partial<SignatureParty>>>([
    { party_type: 'athlete', name: athleteName || '', email: athleteEmail || '' },
    { party_type: 'brand', name: brandName || '', email: brandEmail || '' },
  ]);

  const [errors, setErrors] = useState<FormErrors>({});
  const [activeSection, setActiveSection] = useState<string>('details');

  // Validation
  const validateForm = useCallback((): boolean => {
    const newErrors: FormErrors = {};

    if (!title.trim()) {
      newErrors.title = 'Contract title is required';
    }

    if (compensationAmount <= 0) {
      newErrors.compensation_amount = 'Compensation amount must be greater than 0';
    }

    if (!effectiveDate) {
      newErrors.effective_date = 'Effective date is required';
    }

    if (!expirationDate) {
      newErrors.expiration_date = 'Expiration date is required';
    }

    if (effectiveDate && expirationDate && new Date(effectiveDate) >= new Date(expirationDate)) {
      newErrors.expiration_date = 'Expiration date must be after effective date';
    }

    // Validate parties
    const validParties = parties.filter((p) => p.name?.trim() && p.email?.trim());
    if (validParties.length < 2) {
      newErrors.parties = 'At least two parties (athlete and brand) are required';
    }

    // Validate required clauses have content
    const invalidClauses = clauses.filter((c) => c.is_required && !c.content.trim());
    if (invalidClauses.length > 0) {
      newErrors.clauses = 'All required clauses must have content';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [title, compensationAmount, effectiveDate, expirationDate, parties, clauses]);

  // Build contract data
  const buildContractData = useCallback((): CreateContractInput => {
    return {
      deal_id: dealId,
      template_type: template,
      title: title.trim(),
      description: description.trim() || null,
      effective_date: effectiveDate || null,
      expiration_date: expirationDate || null,
      compensation_amount: compensationAmount,
      compensation_terms: compensationTerms.trim() || null,
      deliverables_summary: deliverablesSummary.trim() || null,
      clauses: clauses.map((c, i) => ({ ...c, order: i })),
      parties: parties.filter((p) => p.name?.trim() && p.email?.trim()) as SignatureParty[],
      custom_terms: customTerms.trim() || null,
      requires_guardian_signature: requiresGuardian,
      requires_witness: requiresWitness,
    };
  }, [
    dealId,
    template,
    title,
    description,
    effectiveDate,
    expirationDate,
    compensationAmount,
    compensationTerms,
    deliverablesSummary,
    clauses,
    parties,
    customTerms,
    requiresGuardian,
    requiresWitness,
  ]);

  // Handlers
  const handleSave = async () => {
    if (!validateForm() || !onSave) return;
    await onSave(buildContractData());
  };

  const handleSend = async () => {
    if (!validateForm() || !onSend) return;
    await onSend(buildContractData());
  };

  const handlePreview = () => {
    onPreview?.(buildContractData());
  };

  const addClause = () => {
    setClauses([
      ...clauses,
      {
        id: `new-${Date.now()}`,
        title: '',
        content: '',
        is_required: false,
        is_editable: true,
        order: clauses.length,
      },
    ]);
  };

  const updateClause = (index: number, updatedClause: ContractClause) => {
    const newClauses = [...clauses];
    newClauses[index] = updatedClause;
    setClauses(newClauses);
  };

  const removeClause = (index: number) => {
    setClauses(clauses.filter((_, i) => i !== index));
  };

  const updateParty = (index: number, updatedParty: Partial<SignatureParty>) => {
    const newParties = [...parties];
    newParties[index] = updatedParty;
    setParties(newParties);
  };

  const removeParty = (index: number) => {
    setParties(parties.filter((_, i) => i !== index));
  };

  const addParty = (type: 'guardian' | 'witness') => {
    setParties([...parties, { party_type: type, name: '', email: '' }]);
    if (type === 'guardian') setRequiresGuardian(true);
    if (type === 'witness') setRequiresWitness(true);
  };

  // Section navigation
  const sections = useMemo(() => [
    { id: 'details', label: 'Contract Details', icon: FileText },
    { id: 'parties', label: 'Parties', icon: User },
    { id: 'clauses', label: 'Terms & Clauses', icon: FileText },
    { id: 'review', label: 'Review', icon: CheckCircle2 },
  ], []);

  return (
    <div className={cn('bg-[var(--bg-primary)]', className)}>
      {/* Section Navigation */}
      <div className="border-b border-[var(--border-color)] bg-[var(--bg-secondary)]">
        <div className="flex items-center gap-1 p-2 overflow-x-auto">
          {sections.map((section) => {
            const Icon = section.icon;
            const isActive = activeSection === section.id;
            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap',
                  isActive
                    ? 'bg-[var(--color-primary)] text-white'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
                )}
              >
                <Icon className="w-4 h-4" />
                {section.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content Sections */}
      <div className="p-6">
        {/* Contract Details Section */}
        {activeSection === 'details' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
                Contract Details
              </h3>

              {/* Template Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  Contract Template
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {templateOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setTemplate(option.value)}
                      className={cn(
                        'p-4 rounded-lg border text-left transition-all',
                        template === option.value
                          ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5'
                          : 'border-[var(--border-color)] hover:border-[var(--color-primary)]/50'
                      )}
                    >
                      <p className="text-sm font-medium text-[var(--text-primary)]">
                        {option.label}
                      </p>
                      <p className="text-xs text-[var(--text-muted)] mt-1">
                        {option.description}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Basic Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <FormField
                    label="Contract Title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter contract title"
                    error={errors.title}
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <TextAreaField
                    label="Description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Brief description of the contract"
                    hint="Optional - A short summary of what this contract covers"
                  />
                </div>

                <FormField
                  label="Compensation Amount"
                  type="number"
                  value={compensationAmount}
                  onChange={(e) => setCompensationAmount(parseFloat(e.target.value) || 0)}
                  error={errors.compensation_amount}
                  required
                />

                <div /> {/* Spacer */}

                <FormField
                  label="Effective Date"
                  type="date"
                  value={effectiveDate}
                  onChange={(e) => setEffectiveDate(e.target.value)}
                  error={errors.effective_date}
                  required
                />

                <FormField
                  label="Expiration Date"
                  type="date"
                  value={expirationDate}
                  onChange={(e) => setExpirationDate(e.target.value)}
                  error={errors.expiration_date}
                  required
                />

                <div className="md:col-span-2">
                  <TextAreaField
                    label="Compensation Terms"
                    value={compensationTerms}
                    onChange={(e) => setCompensationTerms(e.target.value)}
                    placeholder="Payment schedule, conditions, etc."
                    hint="Describe how and when the athlete will be compensated"
                  />
                </div>

                <div className="md:col-span-2">
                  <TextAreaField
                    label="Deliverables Summary"
                    value={deliverablesSummary}
                    onChange={(e) => setDeliverablesSummary(e.target.value)}
                    placeholder="List the deliverables expected from the athlete"
                    hint="What the athlete needs to provide (posts, appearances, etc.)"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Parties Section */}
        {activeSection === 'parties' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                Contract Parties
              </h3>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addParty('guardian')}
                  disabled={parties.some((p) => p.party_type === 'guardian')}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Guardian
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addParty('witness')}
                  disabled={parties.some((p) => p.party_type === 'witness')}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Witness
                </Button>
              </div>
            </div>

            {errors.parties && (
              <div className="p-3 bg-[var(--error-100)] rounded-lg flex items-center gap-2 text-sm text-[var(--color-error)]">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {errors.parties}
              </div>
            )}

            <div className="space-y-4">
              {parties.map((party, index) => (
                <PartyEditor
                  key={index}
                  party={party}
                  index={index}
                  onUpdate={updateParty}
                  onRemove={removeParty}
                  canRemove={party.party_type !== 'athlete' && party.party_type !== 'brand'}
                  type={party.party_type as 'athlete' | 'brand' | 'guardian' | 'witness'}
                />
              ))}
            </div>

            <div className="flex items-center gap-4 pt-4 border-t border-[var(--border-color)]">
              <CheckboxField
                label="Requires parent/guardian signature (for minors)"
                checked={requiresGuardian}
                onChange={(e) => setRequiresGuardian(e.target.checked)}
                description="If the athlete is under 18, a parent or guardian must sign"
              />
            </div>
          </div>
        )}

        {/* Clauses Section */}
        {activeSection === 'clauses' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                Contract Terms & Clauses
              </h3>
              <Button variant="outline" size="sm" onClick={addClause}>
                <Plus className="w-4 h-4 mr-1" />
                Add Clause
              </Button>
            </div>

            {errors.clauses && (
              <div className="p-3 bg-[var(--error-100)] rounded-lg flex items-center gap-2 text-sm text-[var(--color-error)]">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {errors.clauses}
              </div>
            )}

            <div className="space-y-3">
              {clauses.map((clause, index) => (
                <ClauseEditor
                  key={clause.id || index}
                  clause={clause}
                  index={index}
                  onUpdate={updateClause}
                  onRemove={removeClause}
                  canRemove={!clause.is_required || clauses.length > 1}
                />
              ))}
            </div>

            <div className="pt-4 border-t border-[var(--border-color)]">
              <TextAreaField
                label="Additional Custom Terms"
                value={customTerms}
                onChange={(e) => setCustomTerms(e.target.value)}
                placeholder="Any additional terms or conditions not covered by the clauses above"
                hint="These will appear in a separate section of the contract"
                showCount
                maxLength={10000}
              />
            </div>
          </div>
        )}

        {/* Review Section */}
        {activeSection === 'review' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">
              Review Contract
            </h3>

            {/* Summary Card */}
            <div className="p-6 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-color)]">
              <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-4">
                Contract Summary
              </h4>

              <dl className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-[var(--text-muted)]">Title</dt>
                  <dd className="font-medium text-[var(--text-primary)]">{title || 'Not specified'}</dd>
                </div>
                <div>
                  <dt className="text-[var(--text-muted)]">Template</dt>
                  <dd className="font-medium text-[var(--text-primary)] capitalize">
                    {template.replace(/_/g, ' ')}
                  </dd>
                </div>
                <div>
                  <dt className="text-[var(--text-muted)]">Compensation</dt>
                  <dd className="font-medium text-[var(--text-primary)]">
                    ${compensationAmount.toLocaleString()}
                  </dd>
                </div>
                <div>
                  <dt className="text-[var(--text-muted)]">Duration</dt>
                  <dd className="font-medium text-[var(--text-primary)]">
                    {effectiveDate && expirationDate
                      ? `${new Date(effectiveDate).toLocaleDateString()} - ${new Date(expirationDate).toLocaleDateString()}`
                      : 'Dates not set'}
                  </dd>
                </div>
                <div>
                  <dt className="text-[var(--text-muted)]">Parties</dt>
                  <dd className="font-medium text-[var(--text-primary)]">
                    {parties.filter((p) => p.name?.trim()).length} signers
                  </dd>
                </div>
                <div>
                  <dt className="text-[var(--text-muted)]">Clauses</dt>
                  <dd className="font-medium text-[var(--text-primary)]">
                    {clauses.length} clauses ({clauses.filter((c) => c.is_required).length} required)
                  </dd>
                </div>
              </dl>
            </div>

            {/* Validation Status */}
            <div className="p-4 rounded-lg border border-[var(--border-color)]">
              <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-3">
                Validation Checklist
              </h4>
              <ul className="space-y-2">
                {[
                  { label: 'Contract title set', valid: !!title.trim() },
                  { label: 'Compensation amount specified', valid: compensationAmount > 0 },
                  { label: 'Effective date set', valid: !!effectiveDate },
                  { label: 'Expiration date set', valid: !!expirationDate },
                  { label: 'At least 2 parties added', valid: parties.filter((p) => p.name?.trim() && p.email?.trim()).length >= 2 },
                  { label: 'All required clauses have content', valid: clauses.filter((c) => c.is_required && !c.content.trim()).length === 0 },
                ].map((item, index) => (
                  <li key={index} className="flex items-center gap-2 text-sm">
                    {item.valid ? (
                      <CheckCircle2 className="w-4 h-4 text-[var(--color-success)]" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-[var(--color-error)]" />
                    )}
                    <span className={item.valid ? 'text-[var(--text-primary)]' : 'text-[var(--color-error)]'}>
                      {item.label}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Actions Footer */}
      <div className="flex items-center justify-between gap-4 p-6 border-t border-[var(--border-color)] bg-[var(--bg-secondary)]">
        <Button variant="outline" onClick={handlePreview} disabled={isLoading}>
          <Eye className="w-4 h-4 mr-2" />
          Preview
        </Button>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleSave} disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Save Draft
          </Button>

          <Button
            variant="primary"
            onClick={handleSend}
            disabled={isLoading}
            className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)]"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Send className="w-4 h-4 mr-2" />
            )}
            Send for Signature
          </Button>
        </div>
      </div>
    </div>
  );
}

export default ContractBuilder;
