/**
 * HS-NIL PDF — brand performance report
 * ----------------------------------------------------------------------------
 * `buildBrandPerformanceReportPdf(brandData, rangeStart, rangeEnd)` renders
 * a 3-5 page PDF for a brand's cross-deal ROI story. Pure function; caller
 * is responsible for aggregating the live data from Supabase.
 *
 * Layout:
 *   Page 1 — cover + executive stat grid + insights pull-quote
 *   Page 2 — per-deal summary table (up to 25 most recent deals)
 *   Page 3 — top athletes (privacy-masked) + top sports + top states
 *   Page 4 — completion timeline (monthly bar chart via jsPDF primitives)
 *   Page 5 — recommendations (text, generated from stats)
 *
 * Pages are only rendered when include flags permit — callers can opt out
 * of per-deal breakdown, athlete list, or the timeline via the
 * `PerformanceReportData.include` object. That keeps a short-range "just
 * the headline" export from forcing a full 5-page document.
 *
 * PII discipline: athletes are masked with first + last initial + school +
 * sport + state. Emails, phones, DOBs, consent data are never rendered.
 */
import type { jsPDF } from 'jspdf';
import {
  createBrandedDocument,
  setText,
  drawHeader,
  drawRule,
  drawStatBlock,
  drawTable,
  drawWrappedText,
  stampFootersOnAllPages,
  maskAthleteName,
  toBuffer,
  COLORS,
  FONTS,
  MARGINS,
  PAGE_HEIGHT_MM,
  CONTENT_WIDTH,
  type TableColumn,
} from './client';

// ----------------------------------------------------------------------------
// Input types
// ----------------------------------------------------------------------------

export interface PerformanceReportDeal {
  id: string;
  title: string;
  athleteFirstName: string | null;
  athleteLastName: string | null;
  athleteSchool: string | null;
  athleteSport: string | null;
  athleteState: string | null;
  compensationCents: number;
  completedAt: string | null;
  completionDays: number | null;
  shareCount: number;
}

export interface PerformanceReportSummary {
  totalSpendCents: number;
  totalDeals: number;
  averageDealCents: number;
  averageCompletionDays: number | null;
  totalShareEvents: number;
  avgSharesPerDeal: number;
  /** 0..1 — completed deals / total attempted (brand-defined). */
  completionRate: number | null;
}

export interface TopAthlete {
  firstName: string | null;
  lastName: string | null;
  school: string | null;
  sport: string | null;
  state: string | null;
  dealCount: number;
  totalCents: number;
}

export interface TopBreakdown {
  label: string;
  dealCount: number;
  totalCents: number;
}

export interface TimelineBucket {
  /** First-of-month ISO date. */
  month: string;
  dealCount: number;
  totalCents: number;
}

export interface PerformanceReportData {
  brandName: string;
  rangeStart: string; // ISO
  rangeEnd: string; // ISO
  summary: PerformanceReportSummary;
  deals: PerformanceReportDeal[];
  topAthletes: TopAthlete[];
  topSports: TopBreakdown[];
  topStates: TopBreakdown[];
  timeline: TimelineBucket[];
  /** Optional — called-out narrative text. Falls back to a rules-based line. */
  insight?: string | null;
  include?: {
    perDealBreakdown?: boolean;
    athleteList?: boolean;
    timelineChart?: boolean;
  };
}

// ----------------------------------------------------------------------------
// Local formatters
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
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatMonth(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

// ----------------------------------------------------------------------------
// Page: cover + exec stats
// ----------------------------------------------------------------------------

function renderCover(doc: jsPDF, data: PerformanceReportData): void {
  let y = drawHeader(
    doc,
    `Performance report · Generated ${formatDate(new Date().toISOString())}`,
  );
  y += 8;

  setText(doc, FONTS.tiny, 'bold', COLORS.accent);
  doc.text('BRAND PERFORMANCE REPORT', MARGINS.left, y);
  y += 10;

  setText(doc, FONTS.display, 'bold');
  doc.text(data.brandName, MARGINS.left, y);
  y += 8;

  setText(doc, FONTS.body, 'normal', COLORS.textMuted);
  doc.text(
    `${formatDate(data.rangeStart)} — ${formatDate(data.rangeEnd)}`,
    MARGINS.left,
    y,
  );
  y += 8;

  drawRule(doc, y, 'muted');
  y += 10;

  // Executive stat grid: 2 rows × 3 columns
  const colW = CONTENT_WIDTH / 3;
  const col1 = MARGINS.left;
  const col2 = MARGINS.left + colW;
  const col3 = MARGINS.left + 2 * colW;
  const row1Y = y;

  const s = data.summary;

  drawStatBlock(doc, 'Total spend', formatCentsUSD(s.totalSpendCents), col1, row1Y, {
    hint: `${s.totalDeals.toLocaleString()} completed deal${s.totalDeals === 1 ? '' : 's'}`,
    width: colW - 4,
  });
  drawStatBlock(
    doc,
    'Average deal',
    formatCentsUSD(s.averageDealCents),
    col2,
    row1Y,
    { width: colW - 4 },
  );
  drawStatBlock(
    doc,
    'Avg completion',
    s.averageCompletionDays === null
      ? '—'
      : `${s.averageCompletionDays} day${s.averageCompletionDays === 1 ? '' : 's'}`,
    col3,
    row1Y,
    { width: colW - 4 },
  );

  const row2Y = row1Y + 24;

  drawStatBlock(
    doc,
    'Completion rate',
    s.completionRate === null
      ? '—'
      : `${Math.round(s.completionRate * 100)}%`,
    col1,
    row2Y,
    { hint: 'Completed / attempted', width: colW - 4 },
  );
  drawStatBlock(
    doc,
    'Share volume',
    s.totalShareEvents.toLocaleString(),
    col2,
    row2Y,
    {
      hint: `${s.avgSharesPerDeal.toLocaleString()} avg/deal`,
      width: colW - 4,
    },
  );
  drawStatBlock(doc, 'Deals', s.totalDeals.toLocaleString(), col3, row2Y, {
    width: colW - 4,
  });

  y = row2Y + 26;

  drawRule(doc, y, 'accent');
  y += 8;

  // Insight pull-quote
  setText(doc, FONTS.heading, 'bold');
  doc.text('Insight', MARGINS.left, y);
  y += 7;

  const insightText =
    data.insight?.trim() ||
    buildDefaultInsight(data);

  setText(doc, FONTS.body, 'normal');
  y = drawWrappedText(doc, insightText, MARGINS.left, y, CONTENT_WIDTH, 5.2);

  // Accessibility text alternative for screen readers parsing the PDF.
  y += 4;
  setText(doc, FONTS.tiny, 'normal', COLORS.textMuted);
  const alt =
    `Executive summary: ${data.brandName} completed ${s.totalDeals} deals ` +
    `between ${formatDate(data.rangeStart)} and ${formatDate(data.rangeEnd)}, ` +
    `spending ${formatCentsUSD(s.totalSpendCents)} total ` +
    `(average ${formatCentsUSD(s.averageDealCents)} per partnership) and ` +
    `generating ${s.totalShareEvents} share events.`;
  drawWrappedText(doc, alt, MARGINS.left, y, CONTENT_WIDTH, 3.6);
}

function buildDefaultInsight(data: PerformanceReportData): string {
  const s = data.summary;
  if (s.totalDeals === 0) {
    return 'No completed deals in this range. Launch or resume a campaign to start generating organic amplification.';
  }
  const topSport = data.topSports[0]?.label;
  const topState = data.topStates[0]?.label;
  const pieces: string[] = [];
  pieces.push(
    `${data.brandName} completed ${s.totalDeals} partnership${s.totalDeals === 1 ? '' : 's'} in this window, spending ${formatCentsUSD(s.totalSpendCents)} total.`,
  );
  if (topSport) {
    pieces.push(`Your strongest vertical was ${topSport}.`);
  }
  if (topState) {
    pieces.push(`${topState} led the state distribution.`);
  }
  if (s.totalShareEvents > 0) {
    pieces.push(
      `Scholar-athlete families generated ${s.totalShareEvents.toLocaleString()} organic shares — ${s.avgSharesPerDeal.toLocaleString()} per deal on average.`,
    );
  }
  return pieces.join(' ');
}

// ----------------------------------------------------------------------------
// Page: per-deal breakdown table
// ----------------------------------------------------------------------------

function renderDealTable(doc: jsPDF, data: PerformanceReportData): void {
  doc.addPage();
  let y = drawHeader(doc, 'Performance report · Per-deal breakdown') + 4;

  setText(doc, FONTS.heading, 'bold');
  doc.text('Completed deals', MARGINS.left, y);
  y += 4;

  setText(doc, FONTS.small, 'normal', COLORS.textMuted);
  doc.text(
    `Showing the ${Math.min(25, data.deals.length)} most recent completed deal${
      data.deals.length === 1 ? '' : 's'
    }.`,
    MARGINS.left,
    y,
  );
  y += 6;

  if (data.deals.length === 0) {
    setText(doc, FONTS.body, 'normal', COLORS.textMuted);
    doc.text('No completed deals in this range.', MARGINS.left, y + 4);
    return;
  }

  const columns: TableColumn[] = [
    { header: 'Completed', key: 'completed', width: 26 },
    { header: 'Athlete', key: 'athlete', width: 38 },
    { header: 'Sport', key: 'sport', width: 24 },
    { header: 'State', key: 'state', width: 14, align: 'center' },
    { header: 'Spend', key: 'spend', width: 26, align: 'right' },
    { header: 'Days', key: 'days', width: 16, align: 'right' },
    { header: 'Shares', key: 'shares', width: 20, align: 'right' },
  ];

  const rows = data.deals.slice(0, 25).map((d) => ({
    completed: formatDate(d.completedAt),
    athlete: maskAthleteName(d.athleteFirstName, d.athleteLastName),
    sport: d.athleteSport ?? '—',
    state: d.athleteState ?? '—',
    spend: formatCentsUSD(d.compensationCents),
    days: d.completionDays === null ? '—' : String(d.completionDays),
    shares: d.shareCount.toLocaleString(),
  }));

  drawTable(doc, columns, rows, MARGINS.left, y + 2);
}

// ----------------------------------------------------------------------------
// Page: top athletes + sports + states
// ----------------------------------------------------------------------------

function renderTopLists(doc: jsPDF, data: PerformanceReportData): void {
  doc.addPage();
  let y = drawHeader(doc, 'Performance report · Top partnerships') + 4;

  // Top athletes
  setText(doc, FONTS.heading, 'bold');
  doc.text('Top scholar-athletes', MARGINS.left, y);
  y += 4;

  setText(doc, FONTS.small, 'normal', COLORS.textMuted);
  doc.text(
    'Names are first-plus-initial. School / sport / state included for context.',
    MARGINS.left,
    y,
  );
  y += 6;

  if (data.topAthletes.length === 0) {
    setText(doc, FONTS.body, 'normal', COLORS.textMuted);
    doc.text('No scholar-athlete activity in this range.', MARGINS.left, y + 2);
    y += 10;
  } else {
    const columns: TableColumn[] = [
      { header: 'Athlete', key: 'athlete', width: 38 },
      { header: 'School', key: 'school', width: 44 },
      { header: 'Sport', key: 'sport', width: 24 },
      { header: 'State', key: 'state', width: 12, align: 'center' },
      { header: 'Deals', key: 'deals', width: 16, align: 'right' },
      { header: 'Spend', key: 'spend', width: 30, align: 'right' },
    ];
    const rows = data.topAthletes.slice(0, 10).map((a) => ({
      athlete: maskAthleteName(a.firstName, a.lastName),
      school: a.school ?? '—',
      sport: a.sport ?? '—',
      state: a.state ?? '—',
      deals: String(a.dealCount),
      spend: formatCentsUSD(a.totalCents),
    }));
    y = drawTable(doc, columns, rows, MARGINS.left, y + 2);
  }

  // Top sports + top states (side-by-side)
  y += 8;
  drawRule(doc, y, 'muted');
  y += 8;

  const leftX = MARGINS.left;
  const rightX = MARGINS.left + CONTENT_WIDTH / 2 + 4;
  const colW = CONTENT_WIDTH / 2 - 4;

  setText(doc, FONTS.heading, 'bold');
  doc.text('Top sports', leftX, y);
  doc.text('Top states', rightX, y);

  const topY = y + 4;
  renderSmallList(doc, data.topSports.slice(0, 6), leftX, topY, colW);
  renderSmallList(doc, data.topStates.slice(0, 6), rightX, topY, colW);
}

function renderSmallList(
  doc: jsPDF,
  rows: TopBreakdown[],
  x: number,
  y: number,
  width: number,
) {
  if (rows.length === 0) {
    setText(doc, FONTS.body, 'normal', COLORS.textMuted);
    doc.text('No data in this range.', x, y + 4);
    return;
  }
  const max = Math.max(1, ...rows.map((r) => r.dealCount));
  let cursor = y + 4;
  for (const r of rows) {
    setText(doc, FONTS.small, 'normal', COLORS.textMuted);
    doc.text(r.label, x, cursor);

    setText(doc, FONTS.small, 'bold', COLORS.text);
    doc.text(
      `${r.dealCount} · ${formatCentsUSD(r.totalCents)}`,
      x + width,
      cursor,
      { align: 'right' },
    );
    // Bar
    const barMax = width - 6;
    const barLen = (r.dealCount / max) * barMax;
    doc.setFillColor(...COLORS.accent);
    doc.rect(x, cursor + 1.2, Math.max(0.4, barLen), 1.5, 'F');
    cursor += 7;
  }
}

// ----------------------------------------------------------------------------
// Page: monthly completion timeline
// ----------------------------------------------------------------------------

function renderTimeline(doc: jsPDF, data: PerformanceReportData): void {
  if (data.timeline.length === 0) return;

  doc.addPage();
  let y = drawHeader(doc, 'Performance report · Completion timeline') + 4;

  setText(doc, FONTS.heading, 'bold');
  doc.text('Monthly completions', MARGINS.left, y);
  y += 4;

  setText(doc, FONTS.small, 'normal', COLORS.textMuted);
  doc.text(
    'Deals completed per month across this reporting window.',
    MARGINS.left,
    y,
  );
  y += 10;

  // Horizontal bar per month. Each row 8mm; max 20 rows fit on one page.
  const maxCount = Math.max(...data.timeline.map((b) => b.dealCount));
  const labelW = 26;
  const valueW = 26;
  const barMax = CONTENT_WIDTH - labelW - valueW;

  for (const bucket of data.timeline.slice(-24)) {
    if (y > PAGE_HEIGHT_MM - MARGINS.bottom - 12) {
      doc.addPage();
      y = drawHeader(doc, 'Performance report · Completion timeline (cont.)') + 8;
    }
    setText(doc, FONTS.small, 'normal', COLORS.text);
    doc.text(formatMonth(bucket.month), MARGINS.left, y);

    const barLen =
      maxCount > 0 ? (bucket.dealCount / maxCount) * barMax : 0;
    doc.setFillColor(...COLORS.accent);
    doc.rect(MARGINS.left + labelW, y - 3, Math.max(0.4, barLen), 4, 'F');

    setText(doc, FONTS.small, 'bold', COLORS.text);
    doc.text(
      `${bucket.dealCount} · ${formatCentsUSD(bucket.totalCents)}`,
      MARGINS.left + CONTENT_WIDTH,
      y,
      { align: 'right' },
    );
    y += 8;
  }
}

// ----------------------------------------------------------------------------
// Page: recommendations
// ----------------------------------------------------------------------------

function renderRecommendations(doc: jsPDF, data: PerformanceReportData): void {
  doc.addPage();
  let y = drawHeader(doc, 'Performance report · Recommendations') + 4;

  setText(doc, FONTS.heading, 'bold');
  doc.text('Recommendations', MARGINS.left, y);
  y += 7;

  const recs = buildRecommendations(data);

  setText(doc, FONTS.body, 'normal');
  for (const rec of recs) {
    if (y > PAGE_HEIGHT_MM - MARGINS.bottom - 16) break;
    setText(doc, FONTS.subheading, 'bold', COLORS.text);
    doc.text(rec.title, MARGINS.left, y);
    y += 5;
    setText(doc, FONTS.body, 'normal', COLORS.textMuted);
    y = drawWrappedText(doc, rec.body, MARGINS.left, y, CONTENT_WIDTH, 4.8);
    y += 4;
  }
}

function buildRecommendations(
  data: PerformanceReportData,
): Array<{ title: string; body: string }> {
  const out: Array<{ title: string; body: string }> = [];
  const s = data.summary;

  if (s.totalDeals === 0) {
    out.push({
      title: 'Kick off your first scholar-athlete partnership',
      body:
        'There are no completed deals in this reporting window. Post a campaign or accept an athlete match to start generating ROI data. Once at least one deal completes, this report will surface share, vertical, and completion-rate insights.',
    });
    return out;
  }

  if (s.avgSharesPerDeal < 1) {
    out.push({
      title: 'Increase organic amplification',
      body:
        'Less than one share event per completed deal. Consider enabling the "Share-the-win" celebration template for every deal and writing a brand-authored caption — defaults work, but a brand voice performs better.',
    });
  } else if (s.avgSharesPerDeal >= 3) {
    out.push({
      title: 'Double down on your strongest sharers',
      body:
        'Your athlete families are posting — average exceeds three shares per deal. Identify the top-performing partnerships and explore follow-on campaigns with the same athlete cohorts.',
    });
  }

  if (s.averageCompletionDays !== null && s.averageCompletionDays > 21) {
    out.push({
      title: 'Shorten the brief → submission loop',
      body:
        'Your average completion time is above three weeks. Review the deliverables template for friction: are expectations clear, are deadlines explicit, is the approval path unambiguous? Campaigns that clear quickly tend to be re-run.',
    });
  }

  const topSport = data.topSports[0];
  if (topSport && topSport.dealCount >= 3) {
    out.push({
      title: `${topSport.label} is outperforming — build a vertical campaign`,
      body: `${topSport.label} represents ${topSport.dealCount} completed deal${topSport.dealCount === 1 ? '' : 's'} in this window at ${formatCentsUSD(topSport.totalCents)} total spend. Consider standing up a dedicated ${topSport.label.toLowerCase()} campaign template so future outreach inherits the messaging that already worked.`,
    });
  }

  if (out.length === 0) {
    out.push({
      title: 'Keep your cadence steady',
      body:
        'Your metrics are well-distributed across deal size, completion time, and amplification. No specific recommendation — continue the current campaign cadence and revisit this report monthly.',
    });
  }

  return out;
}

// ----------------------------------------------------------------------------
// Public entry point
// ----------------------------------------------------------------------------

export function buildBrandPerformanceReportPdf(
  data: PerformanceReportData,
  rangeStart?: string,
  rangeEnd?: string,
): Buffer {
  // rangeStart/rangeEnd are allowed as separate args for call-site
  // clarity at the API route, but authoritative values come from the
  // data payload. We overwrite only when the caller explicitly passes
  // them so tests can construct data inline.
  const resolved: PerformanceReportData = {
    ...data,
    rangeStart: rangeStart ?? data.rangeStart,
    rangeEnd: rangeEnd ?? data.rangeEnd,
  };

  const include = {
    perDealBreakdown: data.include?.perDealBreakdown ?? true,
    athleteList: data.include?.athleteList ?? true,
    timelineChart: data.include?.timelineChart ?? true,
  };

  const doc = createBrandedDocument();
  renderCover(doc, resolved);
  if (include.perDealBreakdown) renderDealTable(doc, resolved);
  if (include.athleteList) renderTopLists(doc, resolved);
  if (include.timelineChart) renderTimeline(doc, resolved);
  renderRecommendations(doc, resolved);
  stampFootersOnAllPages(doc);
  return toBuffer(doc);
}
