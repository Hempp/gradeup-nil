/**
 * HS-NIL PDF — single-deal report
 * ----------------------------------------------------------------------------
 * `buildDealReportPdf(data)` renders a 2-3 page PDF summarising a single
 * completed deal for the brand that owns it. This is a pure function — all
 * database reads and authentication happen in the calling API route.
 *
 * Layout:
 *   Page 1 — cover + compensation + campaign summary + deliverables list
 *   Page 2 — share breakdown (per platform) + compliance summary
 *   Page 3 — (optional) long deliverable/description overflow
 *
 * PII discipline:
 *   - Athlete name is first + last initial only (maskAthleteName()).
 *   - No email, phone, DOB, parent info, or raw consent IDs surface here.
 *   - Brand + deal amounts + dates render as-is (brand owns the document).
 *
 * Fail-soft:
 *   - Missing share_events → "No shares tracked" instead of a crash.
 *   - Missing dates → "—".
 *   - Missing disclosure → "Not on file" (compliance team can rerun the cron).
 */
import type { jsPDF } from 'jspdf';
import {
  createBrandedDocument,
  setText,
  drawHeader,
  drawRule,
  drawStatBlock,
  drawWrappedText,
  stampFootersOnAllPages,
  maskAthleteName,
  toBuffer,
  COLORS,
  FONTS,
  MARGINS,
  PAGE_WIDTH_MM,
  PAGE_HEIGHT_MM,
  CONTENT_WIDTH,
} from './client';

// ----------------------------------------------------------------------------
// Input types (caller wires these up from live DB rows)
// ----------------------------------------------------------------------------

export interface DealReportDeliverable {
  /** Short human label, e.g. "Instagram reel (30s)". */
  label: string;
  /** 'submitted' | 'accepted' | 'rejected' | null (not-yet-submitted) */
  status: string | null;
}

export interface DealReportShareBreakdown {
  total: number;
  byPlatform: Partial<Record<string, number>>;
  firstShareAt: string | null;
  lastShareAt: string | null;
}

export interface DealReportCompliance {
  stateCode: string | null;
  /** Statutory disclosure window in hours (e.g. 72). Null when not applicable. */
  disclosureWindowHours: number | null;
  /** ISO timestamp the disclosure was recorded as sent. Null if none. */
  disclosedOn: string | null;
  /** Free-text reference (e.g. "hs_parent_consents.id=…") — brand-visible. */
  parentalConsentRef: string | null;
}

export interface DealReportData {
  brandName: string;
  dealTitle: string;
  dealDescription: string | null;
  athleteFirstName: string | null;
  athleteLastName: string | null;
  athleteSport: string | null;
  athleteSchool: string | null;
  athleteState: string | null;
  compensationCents: number;
  compensationType: string | null;
  deliverables: DealReportDeliverable[];
  signedAt: string | null;
  completedAt: string | null;
  shareBreakdown: DealReportShareBreakdown;
  compliance: DealReportCompliance;
  status: string;
}

// ----------------------------------------------------------------------------
// Formatting helpers (local — keep earnings.ts formatters out of the PDF
// path so this module is safe to import from anywhere)
// ----------------------------------------------------------------------------

function formatCentsUSD(cents: number): string {
  const dollars = Math.max(0, cents) / 100;
  return dollars.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function humanize(s: string | null | undefined): string {
  if (!s) return '—';
  return s
    .toString()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

const PLATFORM_LABEL: Record<string, string> = {
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
  x: 'X (Twitter)',
  tiktok: 'TikTok',
  copy_link: 'Copy link',
  generic: 'Generic',
};

// ----------------------------------------------------------------------------
// Page renderers
// ----------------------------------------------------------------------------

function renderCoverAndSummary(doc: jsPDF, data: DealReportData): void {
  let y = drawHeader(doc, `Deal report · Generated ${formatDate(new Date().toISOString())}`);

  // Title band
  y += 8;
  setText(doc, FONTS.tiny, 'bold', COLORS.accent);
  doc.text('COMPLETED DEAL REPORT', MARGINS.left, y);
  y += 8;

  setText(doc, FONTS.display, 'bold');
  const titleLines = doc.splitTextToSize(data.dealTitle, CONTENT_WIDTH) as string[];
  for (const line of titleLines.slice(0, 2)) {
    doc.text(line, MARGINS.left, y);
    y += 9;
  }

  setText(doc, FONTS.body, 'normal', COLORS.textMuted);
  const athleteMasked = maskAthleteName(data.athleteFirstName, data.athleteLastName);
  const subtitleBits = [
    `${data.brandName} × ${athleteMasked}`,
    data.athleteSport,
    data.athleteSchool,
    data.athleteState,
  ].filter((v): v is string => typeof v === 'string' && v.length > 0);
  doc.text(subtitleBits.join(' · '), MARGINS.left, y + 2);
  y += 10;

  drawRule(doc, y, 'muted');
  y += 8;

  // Three stat blocks in a row: compensation / signed / completed
  const col1 = MARGINS.left;
  const col2 = MARGINS.left + CONTENT_WIDTH / 3;
  const col3 = MARGINS.left + (CONTENT_WIDTH * 2) / 3;
  const rowY = y;

  drawStatBlock(
    doc,
    'Compensation',
    formatCentsUSD(data.compensationCents),
    col1,
    rowY,
    {
      hint: humanize(data.compensationType),
      width: CONTENT_WIDTH / 3 - 4,
    },
  );
  drawStatBlock(doc, 'Signed', formatDate(data.signedAt), col2, rowY, {
    valueSize: FONTS.heading,
    width: CONTENT_WIDTH / 3 - 4,
  });
  drawStatBlock(doc, 'Completed', formatDate(data.completedAt), col3, rowY, {
    valueSize: FONTS.heading,
    hint: `Status: ${humanize(data.status)}`,
    width: CONTENT_WIDTH / 3 - 4,
  });
  y = rowY + 24;

  drawRule(doc, y, 'muted');
  y += 8;

  // Campaign summary / description
  setText(doc, FONTS.heading, 'bold');
  doc.text('Campaign summary', MARGINS.left, y);
  y += 6;
  setText(doc, FONTS.body, 'normal');
  y = drawWrappedText(
    doc,
    data.dealDescription?.trim() ||
      'No campaign brief was attached to this deal.',
    MARGINS.left,
    y,
    CONTENT_WIDTH,
  );
  y += 4;

  // Deliverables
  setText(doc, FONTS.heading, 'bold');
  doc.text('Deliverables', MARGINS.left, y);
  y += 6;

  if (data.deliverables.length === 0) {
    setText(doc, FONTS.body, 'normal', COLORS.textMuted);
    doc.text('No deliverable lines recorded on this deal.', MARGINS.left, y);
    y += 6;
  } else {
    setText(doc, FONTS.body, 'normal');
    for (const d of data.deliverables) {
      if (y > PAGE_HEIGHT_MM - MARGINS.bottom - 12) {
        doc.addPage();
        y = drawHeader(doc, 'Deal report (cont.)') + 6;
      }
      const bullet = '•';
      doc.text(bullet, MARGINS.left, y);
      const statusLabel = d.status ? ` [${humanize(d.status)}]` : '';
      const label = `${d.label}${statusLabel}`;
      const wrapped = doc.splitTextToSize(label, CONTENT_WIDTH - 6) as string[];
      for (let i = 0; i < wrapped.length; i += 1) {
        doc.text(wrapped[i], MARGINS.left + 4, y);
        y += 5;
      }
      y += 0.5;
    }
  }
}

function renderSharesAndCompliance(doc: jsPDF, data: DealReportData): void {
  doc.addPage();
  let y = drawHeader(doc, 'Deal report · Performance + compliance') + 6;

  // Performance block — total shares + per-platform breakdown
  setText(doc, FONTS.heading, 'bold');
  doc.text('Share-the-win performance', MARGINS.left, y);
  y += 6;

  const { total, byPlatform, firstShareAt, lastShareAt } = data.shareBreakdown;

  if (total === 0) {
    setText(doc, FONTS.body, 'normal', COLORS.textMuted);
    y = drawWrappedText(
      doc,
      'No shares tracked. The athlete or parent hasn\u2019t clicked a ' +
        'share button on the celebration page yet, or the share pixel ' +
        'didn\u2019t fire. This does not affect deal completion.',
      MARGINS.left,
      y,
      CONTENT_WIDTH,
    );
    y += 4;
  } else {
    // Headline count
    setText(doc, FONTS.display, 'bold');
    doc.text(total.toLocaleString(), MARGINS.left, y + 9);
    setText(doc, FONTS.tiny, 'bold', COLORS.textMuted);
    doc.text(
      `TOTAL SHARE EVENT${total === 1 ? '' : 'S'}`,
      MARGINS.left,
      y + 14,
    );
    y += 20;

    setText(doc, FONTS.body, 'normal', COLORS.textMuted);
    const rangeBits: string[] = [];
    if (firstShareAt) rangeBits.push(`First: ${formatDate(firstShareAt)}`);
    if (lastShareAt) rangeBits.push(`Last: ${formatDate(lastShareAt)}`);
    if (rangeBits.length > 0) {
      doc.text(rangeBits.join('   ·   '), MARGINS.left, y);
      y += 6;
    }

    // Per-platform bar chart via jsPDF primitives.
    //
    // Max bar width 100mm. Each bar height 5mm with 3mm gutter. Labels
    // on the left, count on the right — no external chart lib.
    const platforms = Object.entries(byPlatform)
      .filter(([, n]) => typeof n === 'number' && (n as number) > 0)
      .sort(([, a], [, b]) => (b as number) - (a as number));

    if (platforms.length > 0) {
      setText(doc, FONTS.subheading, 'bold');
      doc.text('By platform', MARGINS.left, y);
      y += 6;

      const maxCount = Math.max(...platforms.map(([, n]) => n as number));
      const barMax = 100;
      const labelW = 28;
      const countW = 18;

      for (const [platform, count] of platforms) {
        const n = count as number;
        const barLen = maxCount > 0 ? (n / maxCount) * barMax : 0;

        setText(doc, FONTS.small, 'normal', COLORS.textMuted);
        doc.text(
          PLATFORM_LABEL[platform] ?? humanize(platform),
          MARGINS.left,
          y,
        );

        doc.setFillColor(...COLORS.accent);
        doc.rect(MARGINS.left + labelW, y - 3, Math.max(0.4, barLen), 4, 'F');

        setText(doc, FONTS.small, 'bold', COLORS.text);
        doc.text(
          n.toLocaleString(),
          MARGINS.left + labelW + barMax + countW - 2,
          y,
          { align: 'right' },
        );
        y += 6;
      }
    }
  }

  y += 6;
  drawRule(doc, y, 'muted');
  y += 8;

  // Compliance summary
  setText(doc, FONTS.heading, 'bold');
  doc.text('State compliance summary', MARGINS.left, y);
  y += 6;

  const rows: Array<[string, string]> = [
    ['State', data.compliance.stateCode ?? '—'],
    [
      'Disclosure window',
      data.compliance.disclosureWindowHours === null
        ? 'Not required in this state'
        : `${data.compliance.disclosureWindowHours}h after signing`,
    ],
    ['Disclosed on', formatDate(data.compliance.disclosedOn)],
    [
      'Parental consent reference',
      data.compliance.parentalConsentRef ?? 'Not on file',
    ],
  ];

  setText(doc, FONTS.body, 'normal');
  for (const [label, value] of rows) {
    setText(doc, FONTS.tiny, 'bold', COLORS.textMuted);
    doc.text(label.toUpperCase(), MARGINS.left, y);
    setText(doc, FONTS.body, 'normal', COLORS.text);
    const valueLines = doc.splitTextToSize(value, CONTENT_WIDTH) as string[];
    for (const line of valueLines) {
      doc.text(line, MARGINS.left, y + 4.5);
      y += 4.5;
    }
    y += 6;
  }

  // Screen-reader-friendly text alternative: a tiny explicit paragraph
  // that restates the compliance story so PDF accessibility tooling +
  // search indexers have a concise summary to anchor on.
  y += 2;
  setText(doc, FONTS.tiny, 'normal', COLORS.textMuted);
  const altText =
    `Compliance narrative: deal completed in ${data.compliance.stateCode ?? 'an unspecified state'}, ` +
    `disclosed ${data.compliance.disclosedOn ? `on ${formatDate(data.compliance.disclosedOn)}` : 'status not recorded'}, ` +
    `parental consent reference ${data.compliance.parentalConsentRef ?? 'not on file'}.`;
  drawWrappedText(doc, altText, MARGINS.left, y, CONTENT_WIDTH, 3.6);
}

// ----------------------------------------------------------------------------
// Public entry point
// ----------------------------------------------------------------------------

export function buildDealReportPdf(data: DealReportData): Buffer {
  const doc = createBrandedDocument();
  renderCoverAndSummary(doc, data);
  renderSharesAndCompliance(doc, data);
  stampFootersOnAllPages(doc);
  return toBuffer(doc);
}
