import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  createContractSchema,
  contractFiltersSchema,
  validateInput,
  formatValidationError,
} from '@/lib/validations';
import type { ContractStatus, SignatureStatus } from '@/lib/validations/contract.schema';
import { enforceRateLimit } from '@/lib/rate-limit';

/**
 * GET /api/contracts
 * Fetch contracts with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse and validate query parameters
    const filters = {
      deal_id: searchParams.get('deal_id') || undefined,
      athlete_id: searchParams.get('athlete_id') || undefined,
      brand_id: searchParams.get('brand_id') || undefined,
      status: searchParams.get('status')?.split(',').filter(Boolean) || undefined,
      template_type: searchParams.get('template_type')?.split(',').filter(Boolean) || undefined,
      from_date: searchParams.get('from_date') || undefined,
      to_date: searchParams.get('to_date') || undefined,
      page: parseInt(searchParams.get('page') || '1', 10),
      page_size: parseInt(searchParams.get('page_size') || '10', 10),
    };

    const validation = validateInput(contractFiltersSchema, filters);
    if (!validation.success) {
      return NextResponse.json(
        { error: formatValidationError(validation.errors) },
        { status: 400 }
      );
    }

    const validatedFilters = validation.data;
    const page = validatedFilters.page ?? 1;
    const pageSize = validatedFilters.page_size ?? 10;
    const offset = (page - 1) * pageSize;

    // Build query
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

    // Apply filters
    if (validatedFilters.deal_id) {
      query = query.eq('deal_id', validatedFilters.deal_id);
    }

    if (validatedFilters.status && validatedFilters.status.length > 0) {
      query = query.in('status', validatedFilters.status);
    }

    if (validatedFilters.template_type && validatedFilters.template_type.length > 0) {
      query = query.in('template_type', validatedFilters.template_type);
    }

    if (validatedFilters.from_date) {
      query = query.gte('created_at', validatedFilters.from_date);
    }

    if (validatedFilters.to_date) {
      query = query.lte('created_at', validatedFilters.to_date);
    }

    const { data, error, count } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      contracts: data,
      pagination: {
        page,
        page_size: pageSize,
        total: count ?? 0,
        total_pages: Math.ceil((count ?? 0) / pageSize),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/contracts
 * Create a new contract
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rateLimited = await enforceRateLimit(request, 'mutation', user.id);
    if (rateLimited) return rateLimited;

    const body = await request.json();

    // Validate input with Zod schema
    const validation = validateInput(createContractSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: formatValidationError(validation.errors) },
        { status: 400 }
      );
    }

    const validatedData = validation.data;

    // Verify the deal exists and user has permission
    const { data: deal, error: dealError } = await supabase
      .from('deals')
      .select(`
        id,
        title,
        athlete_id,
        brand_id,
        athlete:athletes!inner(profile_id),
        brand:brands!inner(profile_id)
      `)
      .eq('id', validatedData.deal_id)
      .single();

    if (dealError || !deal) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 });
    }

    // Verify user is either athlete or brand on this deal
    const athleteData = deal.athlete as unknown as { profile_id: string };
    const brandData = deal.brand as unknown as { profile_id: string };

    const isAthlete = athleteData.profile_id === user.id;
    const isBrand = brandData.profile_id === user.id;

    if (!isAthlete && !isBrand) {
      return NextResponse.json(
        { error: 'You do not have permission to create a contract for this deal' },
        { status: 403 }
      );
    }

    // --- HS-NIL branch: augment signer set + guardian flag for HS deals ----
    // For HS deals with a minor athlete, we MUST require the parent/guardian
    // as a second signer. This mirrors contract engines like SignWell /
    // HelloSign's multi-signer shape via `parties[]` + the guardian flag.
    // For adult HS athletes (18+) only the athlete signs. College deals
    // flow through unchanged.
    let parties = [...validatedData.parties];
    let requiresGuardianSignature = validatedData.requires_guardian_signature;

    try {
      const { isHsDeal, getHsDealSigners } = await import(
        '@/lib/hs-nil/contracts'
      );
      const hsDeal = await isHsDeal(validatedData.deal_id);
      if (hsDeal) {
        const signers = await getHsDealSigners(validatedData.deal_id);
        if (signers.requiresParentSignature) {
          requiresGuardianSignature = true;

          // Add guardian party if the caller didn't already supply one.
          const hasGuardian = parties.some((p) => p.party_type === 'guardian');
          if (!hasGuardian) {
            if (signers.parentEmail && signers.parentFullName) {
              parties.push({
                party_type: 'guardian',
                name: signers.parentFullName,
                email: signers.parentEmail,
                signature_status: 'pending',
              });
            } else {
              // TODO(hs-nil): Minor's deal but no active parental_consents
              // row was found. The simple contract engine here only supports
              // the party types in signaturePartySchema (athlete/brand/
              // guardian/witness). We set the guardian flag so the contract
              // cannot be fully_signed without a guardian signature, but
              // the guardian party row itself is NOT inserted automatically —
              // ops / the athlete must add one manually. Clearly flagged so
              // this path fails loudly instead of silently shipping a
              // single-signer minor contract.
              // eslint-disable-next-line no-console
              console.warn(
                '[hs-nil] HS minor contract created WITHOUT guardian party — ' +
                  'parent consent unresolved. Manual guardian addition required.',
                { dealId: validatedData.deal_id },
              );
            }
          }
        }
      }
    } catch (err) {
      // HS augmentation is best-effort — failures here must not block
      // contract creation. The underlying deal validation step owns the
      // real gate (parental consent required to accept the deal at all).
      // eslint-disable-next-line no-console
      console.warn('[hs-nil] contract signer augmentation failed', {
        dealId: validatedData.deal_id,
        error: err instanceof Error ? err.message : String(err),
      });
    }

    // Create the contract
    const { data: contract, error: contractError } = await supabase
      .from('contracts')
      .insert({
        deal_id: validatedData.deal_id,
        template_type: validatedData.template_type,
        title: validatedData.title,
        description: validatedData.description,
        effective_date: validatedData.effective_date,
        expiration_date: validatedData.expiration_date,
        compensation_amount: validatedData.compensation_amount,
        compensation_terms: validatedData.compensation_terms,
        deliverables_summary: validatedData.deliverables_summary,
        clauses: validatedData.clauses || [],
        custom_terms: validatedData.custom_terms,
        requires_guardian_signature: requiresGuardianSignature,
        requires_witness: validatedData.requires_witness,
        status: 'draft' as ContractStatus,
        created_by: user.id,
      })
      .select()
      .single();

    if (contractError) {
      return NextResponse.json(
        { error: `Failed to create contract: ${contractError.message}` },
        { status: 400 }
      );
    }

    // Create signature records for each party (post-HS augmentation).
    const signatureRecords = parties.map((party) => ({
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
      return NextResponse.json(
        { error: `Failed to create signature records: ${signaturesError.message}` },
        { status: 400 }
      );
    }

    // Fetch the complete contract with signatures
    const { data: completeContract, error: fetchError } = await supabase
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
      .eq('id', contract.id)
      .single();

    if (fetchError) {
      return NextResponse.json(
        { error: fetchError.message },
        { status: 500 }
      );
    }

    return NextResponse.json(completeContract, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
