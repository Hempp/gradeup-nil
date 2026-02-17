import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  updateContractSchema,
  signContractSchema,
  validateInput,
  formatValidationError,
} from '@/lib/validations';
import type { ContractStatus, SignatureStatus } from '@/lib/validations/contract.schema';

/**
 * Verify contract ownership/access
 */
async function verifyContractAccess(
  supabase: Awaited<ReturnType<typeof createClient>>,
  contractId: string,
  userId: string
): Promise<{
  authorized: boolean;
  contract: { id: string; status: ContractStatus; deal_id: string } | null;
  role: 'athlete' | 'brand' | null;
}> {
  const { data: contract, error } = await supabase
    .from('contracts')
    .select(`
      id,
      status,
      deal_id,
      deal:deals!inner(
        athlete:athletes!inner(profile_id),
        brand:brands!inner(profile_id)
      )
    `)
    .eq('id', contractId)
    .single();

  if (error || !contract) {
    return { authorized: false, contract: null, role: null };
  }

  const dealData = contract.deal as unknown as {
    athlete: { profile_id: string };
    brand: { profile_id: string };
  };

  if (dealData.athlete.profile_id === userId) {
    return {
      authorized: true,
      contract: { id: contract.id, status: contract.status, deal_id: contract.deal_id },
      role: 'athlete',
    };
  }

  if (dealData.brand.profile_id === userId) {
    return {
      authorized: true,
      contract: { id: contract.id, status: contract.status, deal_id: contract.deal_id },
      role: 'brand',
    };
  }

  return { authorized: false, contract: null, role: null };
}

/**
 * GET /api/contracts/[id]
 * Fetch a single contract by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: contract, error } = await supabase
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
            profile:profiles(first_name, last_name, email, avatar_url),
            school:schools(name, short_name),
            sport:sports(name)
          ),
          brand:brands(id, company_name, logo_url, contact_name, contact_email)
        ),
        parties:contract_signatures(*)
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Contract not found' }, { status: 404 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(contract);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/contracts/[id]
 * Update a contract (only allowed in draft or pending_signature status)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify access
    const access = await verifyContractAccess(supabase, id, user.id);
    if (!access.authorized || !access.contract) {
      return NextResponse.json(
        { error: 'Contract not found or you do not have permission to modify it' },
        { status: 403 }
      );
    }

    // Check if contract can be edited
    if (!['draft', 'pending_signature'].includes(access.contract.status)) {
      return NextResponse.json(
        { error: 'Contract cannot be edited in its current status' },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Remove fields that shouldn't be updated directly
    const {
      id: _id,
      deal_id: _dealId,
      created_at: _createdAt,
      created_by: _createdBy,
      signed_at: _signedAt,
      voided_at: _voidedAt,
      parties: _parties,
      deal: _deal,
      ...rawUpdates
    } = body;

    // Validate input
    const validation = validateInput(updateContractSchema, rawUpdates);
    if (!validation.success) {
      return NextResponse.json(
        { error: formatValidationError(validation.errors) },
        { status: 400 }
      );
    }

    const updates = validation.data;

    const { data: contract, error } = await supabase
      .from('contracts')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
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
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(contract);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/contracts/[id]
 * Delete a contract (only allowed for draft contracts)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify access
    const access = await verifyContractAccess(supabase, id, user.id);
    if (!access.authorized || !access.contract) {
      return NextResponse.json(
        { error: 'Contract not found or you do not have permission to delete it' },
        { status: 403 }
      );
    }

    // Only allow deletion of draft contracts
    if (access.contract.status !== 'draft') {
      return NextResponse.json(
        { error: 'Only draft contracts can be deleted' },
        { status: 400 }
      );
    }

    // Delete signatures first (foreign key constraint)
    await supabase
      .from('contract_signatures')
      .delete()
      .eq('contract_id', id);

    // Delete the contract
    const { error } = await supabase
      .from('contracts')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/contracts/[id]/sign
 * Sign a contract
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Handle different actions
    if (action === 'sign') {
      return handleSign(supabase, id, user.id, body, request);
    } else if (action === 'decline') {
      return handleDecline(supabase, id, user.id, body);
    } else if (action === 'send') {
      return handleSendForSignature(supabase, id, user.id);
    } else if (action === 'void') {
      return handleVoid(supabase, id, user.id, body);
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Handle contract signing
 */
async function handleSign(
  supabase: Awaited<ReturnType<typeof createClient>>,
  contractId: string,
  userId: string,
  body: Record<string, unknown>,
  request: NextRequest
) {
  // Add contract_id to body for validation
  const signData = { ...body, contract_id: contractId };

  const validation = validateInput(signContractSchema, signData);
  if (!validation.success) {
    return NextResponse.json(
      { error: formatValidationError(validation.errors) },
      { status: 400 }
    );
  }

  const input = validation.data;

  // Find the signature record for this party
  const { data: signature, error: sigError } = await supabase
    .from('contract_signatures')
    .select('*, contract:contracts(status, requires_guardian_signature, requires_witness)')
    .eq('contract_id', contractId)
    .eq('party_type', input.party_type)
    .single();

  if (sigError || !signature) {
    return NextResponse.json(
      { error: 'Signature record not found' },
      { status: 404 }
    );
  }

  const contractData = signature.contract as unknown as {
    status: ContractStatus;
    requires_guardian_signature: boolean;
    requires_witness: boolean;
  };

  if (signature.signature_status !== 'pending') {
    return NextResponse.json(
      { error: 'This party has already signed or declined' },
      { status: 400 }
    );
  }

  if (!['pending_signature', 'partially_signed'].includes(contractData.status)) {
    return NextResponse.json(
      { error: 'Contract is not in a signable state' },
      { status: 400 }
    );
  }

  // Get IP address from request
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || 'unknown';

  // Update the signature
  const { error: updateError } = await supabase
    .from('contract_signatures')
    .update({
      signature_data: input.signature_data,
      signature_type: input.signature_type,
      signature_status: 'signed' as SignatureStatus,
      signed_at: new Date().toISOString(),
      signature_ip: ip,
      updated_at: new Date().toISOString(),
    })
    .eq('id', signature.id);

  if (updateError) {
    return NextResponse.json(
      { error: `Failed to record signature: ${updateError.message}` },
      { status: 400 }
    );
  }

  // Check if all required parties have signed
  const { data: allSignatures, error: allSigError } = await supabase
    .from('contract_signatures')
    .select('signature_status, party_type')
    .eq('contract_id', contractId);

  if (allSigError) {
    return NextResponse.json(
      { error: `Failed to check signatures: ${allSigError.message}` },
      { status: 500 }
    );
  }

  const requiredParties = allSignatures.filter(
    (s) => s.party_type === 'athlete' || s.party_type === 'brand'
  );
  const allRequiredSigned = requiredParties.every((s) => s.signature_status === 'signed');
  const someSigned = allSignatures.some((s) => s.signature_status === 'signed');

  // Determine new status
  let newStatus: ContractStatus;
  if (allRequiredSigned) {
    const guardianSigned = !contractData.requires_guardian_signature ||
      allSignatures.find((s) => s.party_type === 'guardian')?.signature_status === 'signed';
    const witnessSigned = !contractData.requires_witness ||
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
    .eq('id', contractId);

  // Fetch and return updated contract
  const { data: contract, error: fetchError } = await supabase
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

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  return NextResponse.json(contract);
}

/**
 * Handle contract decline
 */
async function handleDecline(
  supabase: Awaited<ReturnType<typeof createClient>>,
  contractId: string,
  userId: string,
  body: { party_type: string; reason: string }
) {
  const { party_type, reason } = body;

  if (!party_type || !reason) {
    return NextResponse.json(
      { error: 'party_type and reason are required' },
      { status: 400 }
    );
  }

  const { data: signature, error: sigError } = await supabase
    .from('contract_signatures')
    .select('id, signature_status')
    .eq('contract_id', contractId)
    .eq('party_type', party_type)
    .single();

  if (sigError || !signature) {
    return NextResponse.json(
      { error: 'Signature record not found' },
      { status: 404 }
    );
  }

  if (signature.signature_status !== 'pending') {
    return NextResponse.json(
      { error: 'This party has already signed or declined' },
      { status: 400 }
    );
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
    return NextResponse.json(
      { error: `Failed to decline contract: ${updateError.message}` },
      { status: 400 }
    );
  }

  // If a required party declines, cancel the contract
  if (party_type === 'athlete' || party_type === 'brand') {
    await supabase
      .from('contracts')
      .update({
        status: 'cancelled' as ContractStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', contractId);
  }

  // Fetch and return updated contract
  const { data: contract, error: fetchError } = await supabase
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

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  return NextResponse.json(contract);
}

/**
 * Handle sending contract for signature
 */
async function handleSendForSignature(
  supabase: Awaited<ReturnType<typeof createClient>>,
  contractId: string,
  userId: string
) {
  const { data: contract, error: fetchError } = await supabase
    .from('contracts')
    .select('status')
    .eq('id', contractId)
    .single();

  if (fetchError || !contract) {
    return NextResponse.json(
      { error: 'Contract not found' },
      { status: 404 }
    );
  }

  if (contract.status !== 'draft') {
    return NextResponse.json(
      { error: 'Only draft contracts can be sent for signature' },
      { status: 400 }
    );
  }

  const { error } = await supabase
    .from('contracts')
    .update({
      status: 'pending_signature' as ContractStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', contractId);

  if (error) {
    return NextResponse.json(
      { error: `Failed to send contract for signature: ${error.message}` },
      { status: 400 }
    );
  }

  // TODO: Send notification emails to all parties

  // Fetch and return updated contract
  const { data: updatedContract, error: updateFetchError } = await supabase
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

  if (updateFetchError) {
    return NextResponse.json({ error: updateFetchError.message }, { status: 500 });
  }

  return NextResponse.json(updatedContract);
}

/**
 * Handle voiding a contract
 */
async function handleVoid(
  supabase: Awaited<ReturnType<typeof createClient>>,
  contractId: string,
  userId: string,
  body: { reason: string; notify_parties?: boolean }
) {
  const { reason, notify_parties = true } = body;

  if (!reason) {
    return NextResponse.json(
      { error: 'reason is required to void a contract' },
      { status: 400 }
    );
  }

  const { data: contract, error: fetchError } = await supabase
    .from('contracts')
    .select('status')
    .eq('id', contractId)
    .single();

  if (fetchError || !contract) {
    return NextResponse.json(
      { error: 'Contract not found' },
      { status: 404 }
    );
  }

  if (contract.status === 'voided') {
    return NextResponse.json(
      { error: 'Contract is already voided' },
      { status: 400 }
    );
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
    return NextResponse.json(
      { error: `Failed to void contract: ${error.message}` },
      { status: 400 }
    );
  }

  // TODO: Send notifications to all parties if notify_parties is true

  // Fetch and return updated contract
  const { data: updatedContract, error: updateFetchError } = await supabase
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

  if (updateFetchError) {
    return NextResponse.json({ error: updateFetchError.message }, { status: 500 });
  }

  return NextResponse.json(updatedContract);
}
