import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getContractPDFBuffer } from '@/lib/services/contracts';
import { enforceRateLimit } from '@/lib/rate-limit';

/**
 * GET /api/contracts/[id]/pdf
 * Download a contract as a PDF file
 *
 * Query parameters:
 * - download: Set to "true" to force download (Content-Disposition: attachment)
 *   Default behavior opens in browser if supported
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const forceDownload = searchParams.get('download') === 'true';

    // Authenticate user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify the user has access to this contract
    const { data: contract, error: accessError } = await supabase
      .from('contracts')
      .select(`
        id,
        deal:deals!inner(
          athlete:athletes!inner(profile_id),
          brand:brands!inner(profile_id)
        )
      `)
      .eq('id', id)
      .single();

    if (accessError || !contract) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 });
    }

    // Check if user is either the athlete or brand on this deal
    const dealData = contract.deal as unknown as {
      athlete: { profile_id: string };
      brand: { profile_id: string };
    };

    const isAthlete = dealData.athlete.profile_id === user.id;
    const isBrand = dealData.brand.profile_id === user.id;

    if (!isAthlete && !isBrand) {
      return NextResponse.json(
        { error: 'You do not have permission to access this contract' },
        { status: 403 }
      );
    }

    // Generate the PDF
    const result = await getContractPDFBuffer(id);

    if (result.error) {
      return NextResponse.json(
        { error: result.error.message },
        { status: 500 }
      );
    }

    const { buffer, filename } = result.data!;

    // Create response with PDF content
    const headers = new Headers();
    headers.set('Content-Type', 'application/pdf');
    headers.set('Content-Length', buffer.length.toString());
    headers.set('Cache-Control', 'private, max-age=0, must-revalidate');

    // Set Content-Disposition based on download preference
    if (forceDownload) {
      headers.set('Content-Disposition', `attachment; filename="${filename}"`);
    } else {
      headers.set('Content-Disposition', `inline; filename="${filename}"`);
    }

    // Convert Buffer to Uint8Array for NextResponse compatibility
    const uint8Array = new Uint8Array(buffer);

    return new NextResponse(uint8Array, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error('[Contract PDF API] Error generating PDF:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/contracts/[id]/pdf
 * Generate and store a new PDF for the contract
 * Returns the URL to the stored PDF
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Authenticate user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rateLimited = await enforceRateLimit(request, 'mutation', user.id);
    if (rateLimited) return rateLimited;

    // Verify the user has access to this contract
    const { data: contract, error: accessError } = await supabase
      .from('contracts')
      .select(`
        id,
        deal:deals!inner(
          athlete:athletes!inner(profile_id),
          brand:brands!inner(profile_id)
        )
      `)
      .eq('id', id)
      .single();

    if (accessError || !contract) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 });
    }

    // Check if user is either the athlete or brand on this deal
    const dealData = contract.deal as unknown as {
      athlete: { profile_id: string };
      brand: { profile_id: string };
    };

    const isAthlete = dealData.athlete.profile_id === user.id;
    const isBrand = dealData.brand.profile_id === user.id;

    if (!isAthlete && !isBrand) {
      return NextResponse.json(
        { error: 'You do not have permission to access this contract' },
        { status: 403 }
      );
    }

    // Import and call the contract service to generate and store PDF
    const { generateContractPDF } = await import('@/lib/services/contracts');
    const result = await generateContractPDF(id);

    if (result.error) {
      return NextResponse.json(
        { error: result.error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      pdf_url: result.data!.pdf_url,
    });
  } catch (error) {
    console.error('[Contract PDF API] Error storing PDF:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}
