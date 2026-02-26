/**
 * Contract PDF Generation Utility
 *
 * Generates professional PDF documents for NIL contracts using jsPDF.
 * Includes GradeUp branding, party information, deal terms, deliverables,
 * signature blocks, and legal footer.
 */

import { jsPDF } from 'jspdf';
import type { Contract, ContractSignature } from '@/lib/services/contracts';
import type { ContractClause } from '@/lib/validations/contract.schema';

// ============================================================================
// TYPES
// ============================================================================

export interface ContractPDFOptions {
  /** Include signature images if available */
  includeSignatures?: boolean;
  /** Mark as draft with watermark */
  isDraft?: boolean;
  /** Include page numbers */
  includePageNumbers?: boolean;
}

interface PDFColors {
  primary: [number, number, number];
  secondary: [number, number, number];
  text: [number, number, number];
  textLight: [number, number, number];
  border: [number, number, number];
  background: [number, number, number];
}

// ============================================================================
// CONSTANTS
// ============================================================================

const COLORS: PDFColors = {
  primary: [0, 122, 255],      // GradeUp blue
  secondary: [88, 86, 214],    // Purple accent
  text: [30, 30, 30],          // Near black for text
  textLight: [100, 100, 100],  // Gray for secondary text
  border: [200, 200, 200],     // Light gray for borders
  background: [248, 249, 250], // Light background
};

const FONTS = {
  title: 24,
  subtitle: 16,
  heading: 14,
  subheading: 12,
  body: 10,
  small: 8,
  tiny: 7,
};

const MARGINS = {
  left: 20,
  right: 20,
  top: 20,
  bottom: 30,
};

const PAGE_WIDTH = 210; // A4 width in mm
const PAGE_HEIGHT = 297; // A4 height in mm
const CONTENT_WIDTH = PAGE_WIDTH - MARGINS.left - MARGINS.right;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Format currency amount
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format date for display
 */
function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Format datetime with time for signatures
 */
function formatDateTime(dateString: string | null | undefined): string {
  if (!dateString) return 'Not signed';
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  });
}

/**
 * Get contract status display text
 */
function getStatusDisplay(status: string): string {
  const statusMap: Record<string, string> = {
    draft: 'DRAFT',
    pending_signature: 'PENDING SIGNATURE',
    partially_signed: 'PARTIALLY SIGNED',
    fully_signed: 'FULLY EXECUTED',
    active: 'ACTIVE',
    expired: 'EXPIRED',
    cancelled: 'CANCELLED',
    voided: 'VOIDED',
  };
  return statusMap[status] || status.toUpperCase();
}

/**
 * Get party type display text
 */
function getPartyTypeDisplay(partyType: string): string {
  const partyMap: Record<string, string> = {
    athlete: 'Athlete',
    brand: 'Brand Representative',
    guardian: 'Parent/Guardian',
    witness: 'Witness',
  };
  return partyMap[partyType] || partyType;
}

/**
 * Split text into lines that fit within a given width
 */
function splitTextToFitWidth(
  doc: jsPDF,
  text: string,
  maxWidth: number
): string[] {
  return doc.splitTextToSize(text, maxWidth);
}

// ============================================================================
// PDF GENERATION
// ============================================================================

/**
 * Generate a PDF document for a contract
 */
export function generateContractPDF(
  contract: Contract,
  options: ContractPDFOptions = {}
): Buffer {
  const {
    includeSignatures = true,
    isDraft = contract.status === 'draft',
    includePageNumbers = true,
  } = options;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  let currentY = MARGINS.top;
  let currentPage = 1;

  // ============================================================================
  // HELPER: Check if we need a new page
  // ============================================================================
  const checkNewPage = (requiredHeight: number): void => {
    if (currentY + requiredHeight > PAGE_HEIGHT - MARGINS.bottom) {
      doc.addPage();
      currentPage++;
      currentY = MARGINS.top;

      // Add draft watermark to new page if needed
      if (isDraft) {
        addDraftWatermark(doc);
      }
    }
  };

  // ============================================================================
  // SECTION: Draft Watermark
  // ============================================================================
  const addDraftWatermark = (pdfDoc: jsPDF): void => {
    pdfDoc.setTextColor(200, 200, 200);
    pdfDoc.setFontSize(60);
    pdfDoc.setFont('helvetica', 'bold');

    // Rotate and center the watermark
    const centerX = PAGE_WIDTH / 2;
    const centerY = PAGE_HEIGHT / 2;

    pdfDoc.text('DRAFT', centerX, centerY, {
      angle: 45,
      align: 'center',
    });

    // Reset text color
    pdfDoc.setTextColor(...COLORS.text);
  };

  // Add draft watermark to first page
  if (isDraft) {
    addDraftWatermark(doc);
  }

  // ============================================================================
  // SECTION: Header with GradeUp Branding
  // ============================================================================
  const addHeader = (): void => {
    // Header background bar
    doc.setFillColor(...COLORS.primary);
    doc.rect(0, 0, PAGE_WIDTH, 35, 'F');

    // GradeUp Logo Text
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(FONTS.title);
    doc.setFont('helvetica', 'bold');
    doc.text('GradeUp', MARGINS.left, 18);

    // Tagline
    doc.setFontSize(FONTS.small);
    doc.setFont('helvetica', 'normal');
    doc.text('NIL Platform for Scholar-Athletes', MARGINS.left, 26);

    // Contract ID and Status (right side)
    doc.setFontSize(FONTS.small);
    doc.text(`Contract ID: ${contract.id.slice(0, 8)}...`, PAGE_WIDTH - MARGINS.right, 18, { align: 'right' });
    doc.text(`Status: ${getStatusDisplay(contract.status)}`, PAGE_WIDTH - MARGINS.right, 26, { align: 'right' });

    currentY = 45;
  };

  addHeader();

  // ============================================================================
  // SECTION: Contract Title
  // ============================================================================
  const addTitle = (): void => {
    doc.setTextColor(...COLORS.text);
    doc.setFontSize(FONTS.subtitle);
    doc.setFont('helvetica', 'bold');
    doc.text('NIL AGREEMENT CONTRACT', PAGE_WIDTH / 2, currentY, { align: 'center' });
    currentY += 8;

    doc.setFontSize(FONTS.heading);
    doc.setFont('helvetica', 'normal');
    const titleLines = splitTextToFitWidth(doc, contract.title, CONTENT_WIDTH);
    titleLines.forEach((line) => {
      doc.text(line, PAGE_WIDTH / 2, currentY, { align: 'center' });
      currentY += 5;
    });

    currentY += 5;

    // Horizontal divider
    doc.setDrawColor(...COLORS.border);
    doc.setLineWidth(0.5);
    doc.line(MARGINS.left, currentY, PAGE_WIDTH - MARGINS.right, currentY);
    currentY += 10;
  };

  addTitle();

  // ============================================================================
  // SECTION: Party Information
  // ============================================================================
  const addPartyInformation = (): void => {
    checkNewPage(60);

    doc.setFontSize(FONTS.heading);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.primary);
    doc.text('PARTIES TO THIS AGREEMENT', MARGINS.left, currentY);
    currentY += 8;

    doc.setTextColor(...COLORS.text);
    doc.setFontSize(FONTS.body);

    // Get athlete and brand info from deal
    const athleteInfo = contract.deal?.athlete;
    const brandInfo = contract.deal?.brand;

    // Two-column layout for parties
    const colWidth = CONTENT_WIDTH / 2 - 5;
    const col1X = MARGINS.left;
    const col2X = MARGINS.left + colWidth + 10;

    // Athlete Column
    doc.setFont('helvetica', 'bold');
    doc.text('ATHLETE:', col1X, currentY);
    doc.setFont('helvetica', 'normal');
    currentY += 5;

    if (athleteInfo) {
      // Handle both flat structure and nested profile structure
      const athleteData = athleteInfo as {
        id: string;
        first_name?: string;
        last_name?: string;
        email?: string;
        profile?: { first_name: string; last_name: string; email: string };
      };
      const firstName = athleteData.first_name || athleteData.profile?.first_name || '';
      const lastName = athleteData.last_name || athleteData.profile?.last_name || '';
      const email = athleteData.email || athleteData.profile?.email || '';

      if (firstName || lastName) {
        doc.text(`Name: ${firstName} ${lastName}`, col1X, currentY);
        currentY += 5;
        doc.text(`Email: ${email}`, col1X, currentY);
      }
    } else {
      const athleteParty = contract.parties?.find((p) => p.party_type === 'athlete');
      if (athleteParty) {
        doc.text(`Name: ${athleteParty.name}`, col1X, currentY);
        currentY += 5;
        doc.text(`Email: ${athleteParty.email}`, col1X, currentY);
      }
    }

    // Reset Y for brand column
    const athleteEndY = currentY;
    currentY = currentY - 10;

    // Brand Column
    doc.setFont('helvetica', 'bold');
    doc.text('BRAND:', col2X, currentY);
    doc.setFont('helvetica', 'normal');
    currentY += 5;

    if (brandInfo) {
      doc.text(`Company: ${brandInfo.company_name}`, col2X, currentY);
      currentY += 5;
      doc.text(`Email: ${brandInfo.contact_email}`, col2X, currentY);
    } else {
      const brandParty = contract.parties?.find((p) => p.party_type === 'brand');
      if (brandParty) {
        doc.text(`Name: ${brandParty.name}`, col2X, currentY);
        currentY += 5;
        doc.text(`Email: ${brandParty.email}`, col2X, currentY);
      }
    }

    currentY = Math.max(currentY, athleteEndY) + 15;

    // Horizontal divider
    doc.setDrawColor(...COLORS.border);
    doc.line(MARGINS.left, currentY, PAGE_WIDTH - MARGINS.right, currentY);
    currentY += 10;
  };

  addPartyInformation();

  // ============================================================================
  // SECTION: Deal Terms and Compensation
  // ============================================================================
  const addDealTerms = (): void => {
    checkNewPage(50);

    doc.setFontSize(FONTS.heading);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.primary);
    doc.text('TERMS AND COMPENSATION', MARGINS.left, currentY);
    currentY += 8;

    doc.setTextColor(...COLORS.text);
    doc.setFontSize(FONTS.body);

    // Terms table
    const termRows = [
      ['Effective Date:', formatDate(contract.effective_date)],
      ['Expiration Date:', formatDate(contract.expiration_date)],
      ['Compensation Amount:', formatCurrency(contract.compensation_amount)],
      ['Template Type:', contract.template_type.replace(/_/g, ' ').toUpperCase()],
    ];

    termRows.forEach(([label, value]) => {
      doc.setFont('helvetica', 'bold');
      doc.text(label, MARGINS.left, currentY);
      doc.setFont('helvetica', 'normal');
      doc.text(value, MARGINS.left + 50, currentY);
      currentY += 6;
    });

    // Compensation terms
    if (contract.compensation_terms) {
      currentY += 3;
      doc.setFont('helvetica', 'bold');
      doc.text('Compensation Terms:', MARGINS.left, currentY);
      currentY += 5;
      doc.setFont('helvetica', 'normal');

      const termsLines = splitTextToFitWidth(doc, contract.compensation_terms, CONTENT_WIDTH);
      termsLines.forEach((line) => {
        checkNewPage(6);
        doc.text(line, MARGINS.left, currentY);
        currentY += 5;
      });
    }

    currentY += 10;

    // Horizontal divider
    doc.setDrawColor(...COLORS.border);
    doc.line(MARGINS.left, currentY, PAGE_WIDTH - MARGINS.right, currentY);
    currentY += 10;
  };

  addDealTerms();

  // ============================================================================
  // SECTION: Deliverables
  // ============================================================================
  const addDeliverables = (): void => {
    if (!contract.deliverables_summary) return;

    checkNewPage(40);

    doc.setFontSize(FONTS.heading);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.primary);
    doc.text('DELIVERABLES', MARGINS.left, currentY);
    currentY += 8;

    doc.setTextColor(...COLORS.text);
    doc.setFontSize(FONTS.body);
    doc.setFont('helvetica', 'normal');

    const deliverableLines = splitTextToFitWidth(doc, contract.deliverables_summary, CONTENT_WIDTH);
    deliverableLines.forEach((line) => {
      checkNewPage(6);
      doc.text(line, MARGINS.left, currentY);
      currentY += 5;
    });

    currentY += 10;

    // Horizontal divider
    doc.setDrawColor(...COLORS.border);
    doc.line(MARGINS.left, currentY, PAGE_WIDTH - MARGINS.right, currentY);
    currentY += 10;
  };

  addDeliverables();

  // ============================================================================
  // SECTION: Contract Clauses
  // ============================================================================
  const addClauses = (): void => {
    const clauses = contract.clauses as ContractClause[];
    if (!clauses || clauses.length === 0) return;

    checkNewPage(30);

    doc.setFontSize(FONTS.heading);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.primary);
    doc.text('TERMS AND CONDITIONS', MARGINS.left, currentY);
    currentY += 10;

    // Sort clauses by order
    const sortedClauses = [...clauses].sort((a, b) => (a.order || 0) - (b.order || 0));

    sortedClauses.forEach((clause, index) => {
      checkNewPage(25);

      doc.setTextColor(...COLORS.text);
      doc.setFontSize(FONTS.subheading);
      doc.setFont('helvetica', 'bold');
      doc.text(`${index + 1}. ${clause.title}`, MARGINS.left, currentY);
      currentY += 6;

      doc.setFontSize(FONTS.body);
      doc.setFont('helvetica', 'normal');

      const contentLines = splitTextToFitWidth(doc, clause.content, CONTENT_WIDTH - 5);
      contentLines.forEach((line) => {
        checkNewPage(5);
        doc.text(line, MARGINS.left + 5, currentY);
        currentY += 5;
      });

      currentY += 5;
    });

    currentY += 5;

    // Horizontal divider
    doc.setDrawColor(...COLORS.border);
    doc.line(MARGINS.left, currentY, PAGE_WIDTH - MARGINS.right, currentY);
    currentY += 10;
  };

  addClauses();

  // ============================================================================
  // SECTION: Custom Terms
  // ============================================================================
  const addCustomTerms = (): void => {
    if (!contract.custom_terms) return;

    checkNewPage(30);

    doc.setFontSize(FONTS.heading);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.primary);
    doc.text('ADDITIONAL TERMS', MARGINS.left, currentY);
    currentY += 8;

    doc.setTextColor(...COLORS.text);
    doc.setFontSize(FONTS.body);
    doc.setFont('helvetica', 'normal');

    const customLines = splitTextToFitWidth(doc, contract.custom_terms, CONTENT_WIDTH);
    customLines.forEach((line) => {
      checkNewPage(6);
      doc.text(line, MARGINS.left, currentY);
      currentY += 5;
    });

    currentY += 10;

    // Horizontal divider
    doc.setDrawColor(...COLORS.border);
    doc.line(MARGINS.left, currentY, PAGE_WIDTH - MARGINS.right, currentY);
    currentY += 10;
  };

  addCustomTerms();

  // ============================================================================
  // SECTION: Signature Blocks
  // ============================================================================
  const addSignatureBlocks = (): void => {
    checkNewPage(80);

    doc.setFontSize(FONTS.heading);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.primary);
    doc.text('SIGNATURES', MARGINS.left, currentY);
    currentY += 10;

    const parties = contract.parties || [];

    // Sort parties: athlete, brand, guardian, witness
    const sortOrder = ['athlete', 'brand', 'guardian', 'witness'];
    const sortedParties = [...parties].sort(
      (a, b) => sortOrder.indexOf(a.party_type) - sortOrder.indexOf(b.party_type)
    );

    const signatureBlockHeight = 40;
    const signatureBlockWidth = CONTENT_WIDTH / 2 - 5;

    sortedParties.forEach((party, index) => {
      const isLeftColumn = index % 2 === 0;
      const blockX = isLeftColumn ? MARGINS.left : MARGINS.left + signatureBlockWidth + 10;

      // Start new row every 2 signatures
      if (index > 0 && index % 2 === 0) {
        currentY += signatureBlockHeight + 10;
        checkNewPage(signatureBlockHeight + 10);
      }

      // Signature box
      doc.setDrawColor(...COLORS.border);
      doc.setLineWidth(0.3);
      doc.rect(blockX, currentY, signatureBlockWidth, signatureBlockHeight);

      // Party type header
      doc.setFillColor(...COLORS.background);
      doc.rect(blockX, currentY, signatureBlockWidth, 8, 'F');
      doc.setTextColor(...COLORS.text);
      doc.setFontSize(FONTS.small);
      doc.setFont('helvetica', 'bold');
      doc.text(getPartyTypeDisplay(party.party_type).toUpperCase(), blockX + 3, currentY + 5);

      // Party name
      doc.setFontSize(FONTS.body);
      doc.setFont('helvetica', 'normal');
      doc.text(`Name: ${party.name}`, blockX + 3, currentY + 14);

      // Signature line or signature data
      const signatureY = currentY + 26;

      if (includeSignatures && party.signature_data && party.signature_status === 'signed') {
        // If signature is typed text (not an image)
        if (party.signature_type === 'typed') {
          doc.setFontSize(FONTS.heading);
          doc.setFont('helvetica', 'italic');
          doc.text(party.signature_data.slice(0, 30), blockX + 3, signatureY);
        } else {
          // For drawn/uploaded signatures, show placeholder text
          doc.setTextColor(...COLORS.textLight);
          doc.setFontSize(FONTS.small);
          doc.text('[Signature on file]', blockX + 3, signatureY);
        }
        doc.setTextColor(...COLORS.text);
      } else {
        // Signature line
        doc.setDrawColor(...COLORS.text);
        doc.line(blockX + 3, signatureY, blockX + signatureBlockWidth - 3, signatureY);
      }

      // Signature status and timestamp
      doc.setFontSize(FONTS.tiny);
      doc.setTextColor(...COLORS.textLight);

      if (party.signature_status === 'signed' && party.signed_at) {
        doc.text(`Signed: ${formatDateTime(party.signed_at)}`, blockX + 3, currentY + 34);
        if (party.signature_ip) {
          doc.text(`IP: ${party.signature_ip}`, blockX + 3, currentY + 38);
        }
      } else if (party.signature_status === 'declined') {
        doc.setTextColor(200, 0, 0);
        doc.text('DECLINED', blockX + 3, currentY + 34);
      } else {
        doc.text('Awaiting signature', blockX + 3, currentY + 34);
      }

      doc.setTextColor(...COLORS.text);
    });

    // Move past signature blocks
    const rows = Math.ceil(sortedParties.length / 2);
    currentY += rows * (signatureBlockHeight + 10) + 10;
  };

  addSignatureBlocks();

  // ============================================================================
  // SECTION: Legal Footer
  // ============================================================================
  const addLegalFooter = (): void => {
    checkNewPage(40);

    // Horizontal divider
    doc.setDrawColor(...COLORS.border);
    doc.line(MARGINS.left, currentY, PAGE_WIDTH - MARGINS.right, currentY);
    currentY += 8;

    doc.setFontSize(FONTS.tiny);
    doc.setTextColor(...COLORS.textLight);
    doc.setFont('helvetica', 'normal');

    const legalText = [
      'NCAA COMPLIANCE NOTICE: This agreement complies with all applicable NCAA Name, Image, and Likeness (NIL) rules',
      'and regulations. The Athlete confirms that this agreement does not constitute pay-for-play and is not contingent',
      'upon athletic performance or enrollment at any particular institution.',
      '',
      'LEGAL DISCLAIMER: This contract is a binding legal agreement. Both parties acknowledge that they have read,',
      'understood, and agree to all terms and conditions contained herein. This agreement shall be governed by the laws',
      'of the state where the Athlete is enrolled as a student-athlete.',
      '',
      `Document generated on ${formatDateTime(new Date().toISOString())}`,
      `Contract Reference: ${contract.id}`,
    ];

    legalText.forEach((line) => {
      checkNewPage(4);
      doc.text(line, PAGE_WIDTH / 2, currentY, { align: 'center' });
      currentY += 4;
    });

    // GradeUp footer branding
    currentY += 5;
    doc.setFontSize(FONTS.small);
    doc.setTextColor(...COLORS.primary);
    doc.setFont('helvetica', 'bold');
    doc.text('Powered by GradeUp NIL Platform', PAGE_WIDTH / 2, currentY, { align: 'center' });
    currentY += 4;
    doc.setFontSize(FONTS.tiny);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.textLight);
    doc.text('www.gradeup.com | support@gradeup.com', PAGE_WIDTH / 2, currentY, { align: 'center' });
  };

  addLegalFooter();

  // ============================================================================
  // SECTION: Page Numbers
  // ============================================================================
  const addPageNumbers = (): void => {
    if (!includePageNumbers) return;

    const totalPages = doc.getNumberOfPages();

    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(FONTS.small);
      doc.setTextColor(...COLORS.textLight);
      doc.text(
        `Page ${i} of ${totalPages}`,
        PAGE_WIDTH / 2,
        PAGE_HEIGHT - 10,
        { align: 'center' }
      );
    }
  };

  addPageNumbers();

  // Return as Buffer for server-side use
  const arrayBuffer = doc.output('arraybuffer');
  return Buffer.from(arrayBuffer);
}

/**
 * Generate a signed contract PDF with all signatures included
 */
export function generateSignedContractPDF(contract: Contract): Buffer {
  return generateContractPDF(contract, {
    includeSignatures: true,
    isDraft: false,
    includePageNumbers: true,
  });
}

/**
 * Generate a draft contract PDF with watermark
 */
export function generateDraftContractPDF(contract: Contract): Buffer {
  return generateContractPDF(contract, {
    includeSignatures: false,
    isDraft: true,
    includePageNumbers: true,
  });
}
