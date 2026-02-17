/**
 * Contract Management Service
 *
 * Handles contract generation, e-signatures, status tracking, and PDF downloads
 * for NIL deals on the GradeUp platform.
 */

import { createClient } from '@/lib/supabase/client';
import type {
  ContractStatus,
  ContractTemplate,
  SignatureStatus,
  ContractClause,
  SignatureParty,
  CreateContractInput,
  UpdateContractInput,
  SignContractInput,
  ContractFilters,
} from '@/lib/validations/contract.schema';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface ServiceResult<T = null> {
  data: T | null;
  error: { message: string; code?: string } | null;
}

export interface Contract {
  id: string;
  deal_id: string;
  template_type: ContractTemplate;
  title: string;
  description: string | null;
  effective_date: string | null;
  expiration_date: string | null;
  compensation_amount: number;
  compensation_terms: string | null;
  deliverables_summary: string | null;
  clauses: ContractClause[];
  parties: ContractSignature[];
  custom_terms: string | null;
  requires_guardian_signature: boolean;
  requires_witness: boolean;
  status: ContractStatus;
  pdf_url: string | null;
  signed_pdf_url: string | null;
  created_at: string;
  updated_at: string;
  signed_at: string | null;
  voided_at: string | null;
  void_reason: string | null;
  // Joined relations
  deal?: {
    id: string;
    title: string;
    athlete_id: string;
    brand_id: string;
    athlete?: {
      id: string;
      first_name: string;
      last_name: string;
      email: string;
    };
    brand?: {
      id: string;
      company_name: string;
      contact_email: string;
    };
  };
}

export interface ContractSignature {
  id: string;
  contract_id: string;
  party_type: 'athlete' | 'brand' | 'guardian' | 'witness';
  user_id: string | null;
  name: string;
  email: string;
  title: string | null;
  signature_data: string | null;
  signature_type: 'drawn' | 'typed' | 'uploaded' | null;
  signature_status: SignatureStatus;
  signed_at: string | null;
  signature_ip: string | null;
  declined_at: string | null;
  decline_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContractTemplateRecord {
  id: string;
  name: string;
  type: ContractTemplate;
  description: string | null;
  default_clauses: ContractClause[];
  is_active: boolean;
  created_at: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONTRACT CRUD OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generate a new contract from deal data
 */
export async function generateContract(
  input: CreateContractInput
): Promise<ServiceResult<Contract>> {
  const supabase = createClient();

  // First, fetch the deal to get athlete and brand info
  const { data: deal, error: dealError } = await supabase
    .from('deals')
    .select(`
      id,
      title,
      athlete_id,
      brand_id,
      athlete:athletes(
        id,
        profile:profiles(first_name, last_name, email)
      ),
      brand:brands(id, company_name, contact_email)
    `)
    .eq('id', input.deal_id)
    .single();

  if (dealError) {
    return {
      data: null,
      error: { message: `Failed to fetch deal: ${dealError.message}`, code: dealError.code },
    };
  }

  // Create the contract
  const { data: contract, error: contractError } = await supabase
    .from('contracts')
    .insert({
      deal_id: input.deal_id,
      template_type: input.template_type,
      title: input.title,
      description: input.description,
      effective_date: input.effective_date,
      expiration_date: input.expiration_date,
      compensation_amount: input.compensation_amount,
      compensation_terms: input.compensation_terms,
      deliverables_summary: input.deliverables_summary,
      clauses: input.clauses || [],
      custom_terms: input.custom_terms,
      requires_guardian_signature: input.requires_guardian_signature,
      requires_witness: input.requires_witness,
      status: 'draft' as ContractStatus,
    })
    .select()
    .single();

  if (contractError) {
    return {
      data: null,
      error: { message: `Failed to create contract: ${contractError.message}`, code: contractError.code },
    };
  }

  // Create signature records for each party
  const signatureRecords = input.parties.map((party) => ({
    contract_id: contract.id,
    party_type: party.party_type,
    user_id: party.user_id || null,
    name: party.name,
    email: party.email,
    title: party.title || null,
    signature_status: 'pending' as SignatureStatus,
  }));

  const { error: signaturesError } = await supabase
    .from('contract_signatures')
    .insert(signatureRecords);

  if (signaturesError) {
    // Rollback contract creation
    await supabase.from('contracts').delete().eq('id', contract.id);
    return {
      data: null,
      error: { message: `Failed to create signature records: ${signaturesError.message}`, code: signaturesError.code },
    };
  }

  // Fetch the complete contract with signatures
  return getContractById(contract.id);
}

/**
 * Get a contract by ID with all related data
 */
export async function getContractById(contractId: string): Promise<ServiceResult<Contract>> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('contracts')
    .select(`
      *,
      deal:deals(
        id,
        title,
        athlete_id,
        brand_id,
        athlete:athletes(
          id,
          profile:profiles(first_name, last_name, email)
        ),
        brand:brands(id, company_name, contact_email)
      ),
      parties:contract_signatures(*)
    `)
    .eq('id', contractId)
    .single();

  if (error) {
    return {
      data: null,
      error: { message: `Failed to fetch contract: ${error.message}`, code: error.code },
    };
  }

  return { data: data as Contract, error: null };
}

/**
 * Get contracts with filters and pagination
 */
export async function getContracts(
  filters: ContractFilters
): Promise<ServiceResult<{ contracts: Contract[]; total: number; page: number; page_size: number; total_pages: number }>> {
  const supabase = createClient();
  const page = filters.page || 1;
  const pageSize = filters.page_size || 10;
  const offset = (page - 1) * pageSize;

  let query = supabase
    .from('contracts')
    .select(`
      *,
      deal:deals(
        id,
        title,
        athlete_id,
        brand_id,
        athlete:athletes(
          id,
          profile:profiles(first_name, last_name, email)
        ),
        brand:brands(id, company_name, contact_email)
      ),
      parties:contract_signatures(*)
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (filters.deal_id) {
    query = query.eq('deal_id', filters.deal_id);
  }

  if (filters.status && filters.status.length > 0) {
    query = query.in('status', filters.status);
  }

  if (filters.template_type && filters.template_type.length > 0) {
    query = query.in('template_type', filters.template_type);
  }

  if (filters.from_date) {
    query = query.gte('created_at', filters.from_date);
  }

  if (filters.to_date) {
    query = query.lte('created_at', filters.to_date);
  }

  const { data, error, count } = await query;

  if (error) {
    return {
      data: null,
      error: { message: `Failed to fetch contracts: ${error.message}`, code: error.code },
    };
  }

  return {
    data: {
      contracts: data as Contract[],
      total: count ?? 0,
      page,
      page_size: pageSize,
      total_pages: Math.ceil((count ?? 0) / pageSize),
    },
    error: null,
  };
}

/**
 * Update a contract (only allowed in draft or pending_signature status)
 */
export async function updateContract(
  contractId: string,
  updates: UpdateContractInput
): Promise<ServiceResult<Contract>> {
  const supabase = createClient();

  // First check if contract can be edited
  const { data: existing, error: fetchError } = await supabase
    .from('contracts')
    .select('status')
    .eq('id', contractId)
    .single();

  if (fetchError) {
    return {
      data: null,
      error: { message: `Contract not found: ${fetchError.message}`, code: fetchError.code },
    };
  }

  if (!['draft', 'pending_signature'].includes(existing.status)) {
    return {
      data: null,
      error: { message: 'Contract cannot be edited in its current status', code: 'INVALID_STATUS' },
    };
  }

  const { data, error } = await supabase
    .from('contracts')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', contractId)
    .select()
    .single();

  if (error) {
    return {
      data: null,
      error: { message: `Failed to update contract: ${error.message}`, code: error.code },
    };
  }

  return getContractById(contractId);
}

/**
 * Send contract for signature (transitions from draft to pending_signature)
 */
export async function sendForSignature(contractId: string): Promise<ServiceResult<Contract>> {
  const supabase = createClient();

  const { data: existing, error: fetchError } = await supabase
    .from('contracts')
    .select('status')
    .eq('id', contractId)
    .single();

  if (fetchError) {
    return {
      data: null,
      error: { message: `Contract not found: ${fetchError.message}`, code: fetchError.code },
    };
  }

  if (existing.status !== 'draft') {
    return {
      data: null,
      error: { message: 'Only draft contracts can be sent for signature', code: 'INVALID_STATUS' },
    };
  }

  const { error } = await supabase
    .from('contracts')
    .update({
      status: 'pending_signature' as ContractStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', contractId);

  if (error) {
    return {
      data: null,
      error: { message: `Failed to send contract for signature: ${error.message}`, code: error.code },
    };
  }

  // TODO: Send notification emails to all parties

  return getContractById(contractId);
}

// ═══════════════════════════════════════════════════════════════════════════
// SIGNATURE OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Sign a contract
 */
export async function signContract(input: SignContractInput): Promise<ServiceResult<Contract>> {
  const supabase = createClient();

  // Get the current user
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return {
      data: null,
      error: { message: 'Authentication required', code: 'UNAUTHORIZED' },
    };
  }

  // Find the signature record for this party
  const { data: signature, error: sigError } = await supabase
    .from('contract_signatures')
    .select('*, contract:contracts(status)')
    .eq('contract_id', input.contract_id)
    .eq('party_type', input.party_type)
    .single();

  if (sigError) {
    return {
      data: null,
      error: { message: `Signature record not found: ${sigError.message}`, code: sigError.code },
    };
  }

  if (signature.signature_status !== 'pending') {
    return {
      data: null,
      error: { message: 'This party has already signed or declined', code: 'ALREADY_SIGNED' },
    };
  }

  if (!['pending_signature', 'partially_signed'].includes(signature.contract.status)) {
    return {
      data: null,
      error: { message: 'Contract is not in a signable state', code: 'INVALID_STATUS' },
    };
  }

  // Update the signature
  const { error: updateError } = await supabase
    .from('contract_signatures')
    .update({
      signature_data: input.signature_data,
      signature_type: input.signature_type,
      signature_status: 'signed' as SignatureStatus,
      signed_at: new Date().toISOString(),
      signature_ip: input.ip_address || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', signature.id);

  if (updateError) {
    return {
      data: null,
      error: { message: `Failed to record signature: ${updateError.message}`, code: updateError.code },
    };
  }

  // Check if all required parties have signed
  const { data: allSignatures, error: allSigError } = await supabase
    .from('contract_signatures')
    .select('signature_status, party_type')
    .eq('contract_id', input.contract_id);

  if (allSigError) {
    return {
      data: null,
      error: { message: `Failed to check signatures: ${allSigError.message}`, code: allSigError.code },
    };
  }

  const requiredParties = allSignatures.filter(
    (s) => s.party_type === 'athlete' || s.party_type === 'brand'
  );
  const allRequiredSigned = requiredParties.every((s) => s.signature_status === 'signed');
  const someSigned = allSignatures.some((s) => s.signature_status === 'signed');

  // Update contract status
  let newStatus: ContractStatus;
  if (allRequiredSigned) {
    // Check if guardian/witness also required
    const { data: contract } = await supabase
      .from('contracts')
      .select('requires_guardian_signature, requires_witness')
      .eq('id', input.contract_id)
      .single();

    const guardianSigned = !contract?.requires_guardian_signature ||
      allSignatures.find((s) => s.party_type === 'guardian')?.signature_status === 'signed';
    const witnessSigned = !contract?.requires_witness ||
      allSignatures.find((s) => s.party_type === 'witness')?.signature_status === 'signed';

    if (guardianSigned && witnessSigned) {
      newStatus = 'fully_signed';
    } else {
      newStatus = 'partially_signed';
    }
  } else if (someSigned) {
    newStatus = 'partially_signed';
  } else {
    newStatus = 'pending_signature';
  }

  await supabase
    .from('contracts')
    .update({
      status: newStatus,
      signed_at: newStatus === 'fully_signed' ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.contract_id);

  return getContractById(input.contract_id);
}

/**
 * Decline to sign a contract
 */
export async function declineContract(
  contractId: string,
  partyType: 'athlete' | 'brand' | 'guardian' | 'witness',
  reason: string
): Promise<ServiceResult<Contract>> {
  const supabase = createClient();

  const { data: signature, error: sigError } = await supabase
    .from('contract_signatures')
    .select('id, signature_status')
    .eq('contract_id', contractId)
    .eq('party_type', partyType)
    .single();

  if (sigError) {
    return {
      data: null,
      error: { message: `Signature record not found: ${sigError.message}`, code: sigError.code },
    };
  }

  if (signature.signature_status !== 'pending') {
    return {
      data: null,
      error: { message: 'This party has already signed or declined', code: 'ALREADY_PROCESSED' },
    };
  }

  const { error: updateError } = await supabase
    .from('contract_signatures')
    .update({
      signature_status: 'declined' as SignatureStatus,
      declined_at: new Date().toISOString(),
      decline_reason: reason,
      updated_at: new Date().toISOString(),
    })
    .eq('id', signature.id);

  if (updateError) {
    return {
      data: null,
      error: { message: `Failed to decline contract: ${updateError.message}`, code: updateError.code },
    };
  }

  // Update contract status to cancelled if a required party declines
  if (partyType === 'athlete' || partyType === 'brand') {
    await supabase
      .from('contracts')
      .update({
        status: 'cancelled' as ContractStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', contractId);
  }

  return getContractById(contractId);
}

/**
 * Get the current signature status of a contract
 */
export async function getContractStatus(contractId: string): Promise<ServiceResult<{
  contract_status: ContractStatus;
  signatures: Array<{
    party_type: string;
    name: string;
    status: SignatureStatus;
    signed_at: string | null;
  }>;
  all_signed: boolean;
  can_sign: boolean;
}>> {
  const supabase = createClient();

  const { data: contract, error: contractError } = await supabase
    .from('contracts')
    .select('status')
    .eq('id', contractId)
    .single();

  if (contractError) {
    return {
      data: null,
      error: { message: `Contract not found: ${contractError.message}`, code: contractError.code },
    };
  }

  const { data: signatures, error: sigError } = await supabase
    .from('contract_signatures')
    .select('party_type, name, signature_status, signed_at')
    .eq('contract_id', contractId)
    .order('party_type');

  if (sigError) {
    return {
      data: null,
      error: { message: `Failed to fetch signatures: ${sigError.message}`, code: sigError.code },
    };
  }

  const allSigned = signatures.every((s) => s.signature_status === 'signed');
  const canSign = ['pending_signature', 'partially_signed'].includes(contract.status);

  return {
    data: {
      contract_status: contract.status,
      signatures: signatures.map((s) => ({
        party_type: s.party_type,
        name: s.name,
        status: s.signature_status,
        signed_at: s.signed_at,
      })),
      all_signed: allSigned,
      can_sign: canSign,
    },
    error: null,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// PDF OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generate PDF for a contract
 * Returns a URL to the generated PDF
 */
export async function generateContractPDF(contractId: string): Promise<ServiceResult<{ pdf_url: string }>> {
  const supabase = createClient();

  // Fetch complete contract data
  const contractResult = await getContractById(contractId);
  if (contractResult.error) {
    return { data: null, error: contractResult.error };
  }

  const contract = contractResult.data!;

  // In a real implementation, this would call a PDF generation service
  // For now, we'll generate a simple HTML template and convert it
  // This could use services like:
  // - Puppeteer for server-side PDF generation
  // - react-pdf for client-side
  // - External services like DocuSign, PandaDoc, or custom PDF APIs

  // Simulate PDF generation by creating a storage reference
  const pdfFileName = `contracts/${contractId}/${Date.now()}_contract.pdf`;

  // TODO: Implement actual PDF generation
  // const pdfBuffer = await generatePDFFromTemplate(contract);
  // const { data: uploadData, error: uploadError } = await supabase.storage
  //   .from('contracts')
  //   .upload(pdfFileName, pdfBuffer, { contentType: 'application/pdf' });

  // For now, return a placeholder
  const pdfUrl = `/api/contracts/${contractId}/pdf`;

  // Update contract with PDF URL
  await supabase
    .from('contracts')
    .update({ pdf_url: pdfUrl, updated_at: new Date().toISOString() })
    .eq('id', contractId);

  return { data: { pdf_url: pdfUrl }, error: null };
}

/**
 * Download contract PDF
 * Returns contract data needed to generate PDF on the client or server
 */
export async function downloadContract(contractId: string): Promise<ServiceResult<{
  contract: Contract;
  download_url: string | null;
}>> {
  const contractResult = await getContractById(contractId);
  if (contractResult.error) {
    return { data: null, error: contractResult.error };
  }

  const contract = contractResult.data!;

  // If contract is fully signed and has a signed PDF, return that
  // Otherwise return the draft PDF URL
  const downloadUrl = contract.signed_pdf_url || contract.pdf_url;

  return {
    data: {
      contract,
      download_url: downloadUrl,
    },
    error: null,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// TEMPLATE OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get available contract templates
 */
export async function getContractTemplates(): Promise<ServiceResult<ContractTemplateRecord[]>> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('contract_templates')
    .select('*')
    .eq('is_active', true)
    .order('name');

  if (error) {
    return {
      data: null,
      error: { message: `Failed to fetch templates: ${error.message}`, code: error.code },
    };
  }

  return { data: data as unknown as ContractTemplateRecord[], error: null };
}

/**
 * Get default clauses for a template type
 */
export async function getDefaultClauses(templateType: ContractTemplate): Promise<ServiceResult<ContractClause[]>> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('contract_templates')
    .select('default_clauses')
    .eq('type', templateType)
    .single();

  if (error) {
    // Return standard default clauses if template not found
    return {
      data: getStandardClauses(templateType),
      error: null,
    };
  }

  return { data: data.default_clauses as ContractClause[], error: null };
}

/**
 * Standard default clauses for each template type
 */
function getStandardClauses(templateType: ContractTemplate): ContractClause[] {
  const commonClauses: ContractClause[] = [
    {
      title: 'Agreement',
      content: 'This Agreement is entered into between the Brand and the Athlete as identified in this contract.',
      is_required: true,
      is_editable: false,
      order: 0,
    },
    {
      title: 'Compensation',
      content: 'The Brand agrees to pay the Athlete the compensation amount specified in this contract for the services rendered.',
      is_required: true,
      is_editable: true,
      order: 1,
    },
    {
      title: 'Term',
      content: 'This Agreement shall commence on the Effective Date and continue until the Expiration Date unless terminated earlier.',
      is_required: true,
      is_editable: true,
      order: 2,
    },
    {
      title: 'NCAA Compliance',
      content: 'Both parties agree to comply with all applicable NCAA rules and regulations regarding Name, Image, and Likeness (NIL) activities.',
      is_required: true,
      is_editable: false,
      order: 3,
    },
    {
      title: 'Termination',
      content: 'Either party may terminate this Agreement with written notice if the other party materially breaches any term of this Agreement.',
      is_required: true,
      is_editable: false,
      order: 4,
    },
    {
      title: 'Governing Law',
      content: 'This Agreement shall be governed by the laws of the state where the Athlete is enrolled as a student.',
      is_required: true,
      is_editable: false,
      order: 5,
    },
  ];

  // Add template-specific clauses
  const templateSpecific: Record<string, ContractClause[]> = {
    social_media_campaign: [
      {
        title: 'Content Requirements',
        content: 'The Athlete agrees to create and post content as specified in the deliverables section of this contract.',
        is_required: true,
        is_editable: true,
        order: 6,
      },
      {
        title: 'Content Approval',
        content: 'All content must be submitted to the Brand for approval at least 48 hours before posting.',
        is_required: false,
        is_editable: true,
        order: 7,
      },
    ],
    appearance_agreement: [
      {
        title: 'Appearance Details',
        content: 'The Athlete agrees to appear at the location, date, and time specified in this contract.',
        is_required: true,
        is_editable: true,
        order: 6,
      },
      {
        title: 'Attire and Conduct',
        content: 'The Athlete agrees to dress appropriately and conduct themselves professionally during the appearance.',
        is_required: true,
        is_editable: false,
        order: 7,
      },
    ],
    merchandise_licensing: [
      {
        title: 'License Grant',
        content: 'The Athlete grants the Brand a limited, non-exclusive license to use their Name, Image, and Likeness on approved merchandise.',
        is_required: true,
        is_editable: true,
        order: 6,
      },
      {
        title: 'Quality Standards',
        content: 'All merchandise bearing the Athlete\'s likeness must meet reasonable quality standards.',
        is_required: true,
        is_editable: false,
        order: 7,
      },
    ],
  };

  return [...commonClauses, ...(templateSpecific[templateType as string] || [])];
}

// ═══════════════════════════════════════════════════════════════════════════
// VOID/CANCEL OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Void a contract (admin action)
 */
export async function voidContract(
  contractId: string,
  reason: string,
  notifyParties: boolean = true
): Promise<ServiceResult<Contract>> {
  const supabase = createClient();

  const { data: existing, error: fetchError } = await supabase
    .from('contracts')
    .select('status')
    .eq('id', contractId)
    .single();

  if (fetchError) {
    return {
      data: null,
      error: { message: `Contract not found: ${fetchError.message}`, code: fetchError.code },
    };
  }

  if (existing.status === 'voided') {
    return {
      data: null,
      error: { message: 'Contract is already voided', code: 'ALREADY_VOIDED' },
    };
  }

  const { error } = await supabase
    .from('contracts')
    .update({
      status: 'voided' as ContractStatus,
      voided_at: new Date().toISOString(),
      void_reason: reason,
      updated_at: new Date().toISOString(),
    })
    .eq('id', contractId);

  if (error) {
    return {
      data: null,
      error: { message: `Failed to void contract: ${error.message}`, code: error.code },
    };
  }

  // TODO: Send notifications to all parties if notifyParties is true

  return getContractById(contractId);
}

/**
 * Get contracts for a specific athlete
 */
export async function getAthleteContracts(
  athleteId: string,
  filters?: Partial<ContractFilters>
): Promise<ServiceResult<{ contracts: Contract[]; total: number }>> {
  const supabase = createClient();

  let query = supabase
    .from('contracts')
    .select(`
      *,
      deal:deals!inner(
        id,
        title,
        athlete_id,
        brand_id,
        brand:brands(id, company_name, contact_email)
      ),
      parties:contract_signatures(*)
    `, { count: 'exact' })
    .eq('deal.athlete_id', athleteId)
    .order('created_at', { ascending: false });

  if (filters?.status && filters.status.length > 0) {
    query = query.in('status', filters.status);
  }

  const { data, error, count } = await query;

  if (error) {
    return {
      data: null,
      error: { message: `Failed to fetch athlete contracts: ${error.message}`, code: error.code },
    };
  }

  return {
    data: {
      contracts: data as Contract[],
      total: count ?? 0,
    },
    error: null,
  };
}

/**
 * Get contracts for a specific brand
 */
export async function getBrandContracts(
  brandId: string,
  filters?: Partial<ContractFilters>
): Promise<ServiceResult<{ contracts: Contract[]; total: number }>> {
  const supabase = createClient();

  let query = supabase
    .from('contracts')
    .select(`
      *,
      deal:deals!inner(
        id,
        title,
        athlete_id,
        brand_id,
        athlete:athletes(
          id,
          profile:profiles(first_name, last_name, email)
        )
      ),
      parties:contract_signatures(*)
    `, { count: 'exact' })
    .eq('deal.brand_id', brandId)
    .order('created_at', { ascending: false });

  if (filters?.status && filters.status.length > 0) {
    query = query.in('status', filters.status);
  }

  const { data, error, count } = await query;

  if (error) {
    return {
      data: null,
      error: { message: `Failed to fetch brand contracts: ${error.message}`, code: error.code },
    };
  }

  return {
    data: {
      contracts: data as Contract[],
      total: count ?? 0,
    },
    error: null,
  };
}
