/**
 * HS-NIL Tier B — OCR Provider Interface + Implementations
 * ----------------------------------------------------------------------------
 * Provider-agnostic transcript OCR. Designed so the interface stays cheap to
 * swap: today we ship a stub + OpenAI Vision + Google Vision. Tomorrow's
 * AWS Textract / Azure Form Recognizer implementations fit behind the same
 * contract without touching `runOcrForSubmission` or the auto-approval gate.
 *
 * Fail-closed semantics (mirrors `src/lib/hs-nil/payouts.ts`):
 *   - In dev / test the stub returns a deterministic result matching the
 *     athlete's claimed GPA at confidence 0.80 — JUST below the 0.90 auto-
 *     approval threshold on purpose, so "no real OCR configured" always
 *     routes to manual review unless an operator explicitly overrides.
 *   - In production the stub THROWS on first use. A missing `OCR_PROVIDER`
 *     env var cannot silently approve a transcript.
 *
 * Selection (env-driven, see `getOcrProvider`):
 *   - OCR_PROVIDER=openai → OpenAiVisionProvider (requires OPENAI_API_KEY)
 *   - OCR_PROVIDER=google → GoogleVisionProvider (requires GOOGLE_VISION_SERVICE_KEY)
 *   - OCR_PROVIDER=stub or unset → StubOcrProvider (throws in prod)
 *
 * The provider receives a signed storage URL (not raw bytes) because both
 * real providers prefer a URL they fetch themselves — OpenAI accepts an
 * image_url content part; Google Vision accepts gcs+https URIs OR inline
 * base64. Keeping the signed URL as the transport primitive works for both.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type OcrProviderName = 'stub' | 'openai_vision' | 'google_vision';

export interface OcrExtractionInput {
  /** Storage bucket name, e.g. 'hs-transcripts'. */
  storageBucket: string;
  /** Object path inside the bucket. */
  storagePath: string;
  /** MIME type of the uploaded file — 'application/pdf' | 'image/png' | 'image/jpeg'. */
  mimeType: string;
  /** Short-lived signed URL (same one ops sees in the queue). */
  signedUrl: string;
  /** The athlete's claimed GPA — used ONLY for matchesClaimed flagging. */
  claimedGpa: number;
}

export interface OcrResult {
  /** GPA extracted from the transcript, normalised to a 4.0 scale. Null if not found. */
  gpa: number | null;
  /** Original scale detected on the transcript: 4.0 or 5.0. Null if ambiguous. */
  gpaScale: number | null;
  /** Term label extracted (e.g. 'Fall 2025'). Null if not found. */
  term: string | null;
  /** Provider confidence in [0, 1] that the extraction is correct. */
  confidence: number;
  /** Full raw response for audit + parse tuning. */
  raw: Record<string, unknown>;
  /** Wall-clock ms the provider call took. */
  processingMs: number;
  /**
   * True iff normalised `gpa` is within ±0.05 of `claimedGpa` AFTER
   * scale normalisation. Auto-approval is gated on both this AND
   * `confidence >= 0.90` (see ocr.ts).
   */
  matchesClaimed: boolean;
  /**
   * Canonical provider name for the DB `provider` column.
   */
  providerName: OcrProviderName;
  /**
   * Populated on failure. Callers still persist the row so the
   * attempt is auditable; `gpa`/`confidence` will be null/0.
   */
  error?: string;
}

export interface OcrProvider {
  name: OcrProviderName;
  extractTranscript(input: OcrExtractionInput): Promise<OcrResult>;
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

export const GPA_MATCH_TOLERANCE = 0.05;

/**
 * Normalise a transcript GPA to a 4.0 scale for comparison against
 * claimed_gpa (which is stored 0–5 but typically reported on a 4.0 scale).
 * If `scale` is unknown we assume 4.0 — safer than forcing a 5.0→4.0
 * divide that could silently lower a legit GPA.
 */
export function normaliseGpaTo4(
  gpa: number | null,
  scale: number | null
): number | null {
  if (gpa === null || !Number.isFinite(gpa)) return null;
  if (scale === 5.0) return Math.round(((gpa / 5.0) * 4.0) * 100) / 100;
  return Math.round(gpa * 100) / 100;
}

function computeMatchesClaimed(
  extractedGpa: number | null,
  gpaScale: number | null,
  claimedGpa: number
): boolean {
  const normalised = normaliseGpaTo4(extractedGpa, gpaScale);
  if (normalised === null) return false;
  return Math.abs(normalised - claimedGpa) <= GPA_MATCH_TOLERANCE;
}

// ---------------------------------------------------------------------------
// Stub provider
// ---------------------------------------------------------------------------

/**
 * Stub implementation — deterministic dev/test echo of the claimed GPA
 * at confidence 0.80 (sub-threshold on purpose). In production this
 * THROWS; missing real provider config cannot silently approve a
 * transcript.
 */
export class StubOcrProvider implements OcrProvider {
  readonly name: OcrProviderName = 'stub';

  async extractTranscript(input: OcrExtractionInput): Promise<OcrResult> {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        '[hs-nil ocr] ocr provider not configured (production). ' +
          'Refusing to run the stub — set OCR_PROVIDER=openai|google and ' +
          'the matching credentials.'
      );
    }

    const start = Date.now();
    const gpa = Number.isFinite(input.claimedGpa) ? input.claimedGpa : null;
    // Detect plausible scale: claimed GPA > 4.0 is almost always weighted
    // (5.0 scale). Everything at-or-under treats as 4.0.
    const gpaScale = gpa !== null && gpa > 4.0 ? 5.0 : 4.0;
    const processingMs = Math.max(1, Date.now() - start);

    return {
      gpa,
      gpaScale,
      term: 'Fall 2025',
      confidence: 0.8,
      raw: {
        stub: true,
        note: 'Deterministic dev echo; confidence deliberately sub-threshold.',
        storagePath: input.storagePath,
      },
      processingMs,
      matchesClaimed: computeMatchesClaimed(gpa, gpaScale, input.claimedGpa),
      providerName: this.name,
    };
  }
}

// ---------------------------------------------------------------------------
// OpenAI Vision provider
// ---------------------------------------------------------------------------

const OPENAI_SYSTEM_PROMPT = `You are extracting structured data from a U.S. high school transcript image.
Return ONLY a JSON object with keys: gpa (number|null), gpa_scale (4.0|5.0|null), term (string|null), confidence (0..1).
- gpa: the most prominent cumulative GPA on the document, as a number.
- gpa_scale: the scale it is reported on. 4.0 is unweighted; 5.0 is weighted. Only emit 4.0 or 5.0.
- term: the latest term covered (e.g. "Fall 2025").
- confidence: your honest confidence that the extraction is correct, in [0,1]. Drop below 0.5 if the document is blurry, partial, or not clearly a transcript.
Do not include any commentary. Do not wrap in markdown code fences.`;

interface OpenAiVisionResponseChoice {
  message?: { content?: string | null };
}
interface OpenAiVisionResponse {
  choices?: OpenAiVisionResponseChoice[];
}

/**
 * OpenAI Vision adapter. Uses the Chat Completions endpoint with an image
 * content-part. We deliberately keep this as a raw `fetch` call — the
 * project has no `openai` SDK dependency and the surface area we need is
 * small enough that a dep would be wasteful.
 */
export class OpenAiVisionProvider implements OcrProvider {
  readonly name: OcrProviderName = 'openai_vision';

  async extractTranscript(input: OcrExtractionInput): Promise<OcrResult> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error(
        '[hs-nil ocr] OPENAI_API_KEY missing — cannot run OpenAiVisionProvider.'
      );
    }

    const model = process.env.OPENAI_VISION_MODEL || 'gpt-4o';
    const start = Date.now();

    let raw: Record<string, unknown> = {};
    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: OPENAI_SYSTEM_PROMPT },
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: 'Extract the transcript data as JSON.',
                },
                {
                  type: 'image_url',
                  image_url: { url: input.signedUrl, detail: 'high' },
                },
              ],
            },
          ],
          temperature: 0,
        }),
      });

      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(
          `OpenAI Vision ${res.status}: ${body.slice(0, 500) || res.statusText}`
        );
      }

      const json = (await res.json()) as OpenAiVisionResponse;
      raw = json as Record<string, unknown>;
      const content = json.choices?.[0]?.message?.content ?? '';
      const parsed = safeParseJson(content);

      const gpa = pickNumber(parsed, 'gpa');
      const gpaScale = pickScale(parsed, 'gpa_scale');
      const term = pickString(parsed, 'term');
      const confidence = clamp01(pickNumber(parsed, 'confidence') ?? 0);

      return {
        gpa,
        gpaScale,
        term,
        confidence,
        raw,
        processingMs: Date.now() - start,
        matchesClaimed: computeMatchesClaimed(gpa, gpaScale, input.claimedGpa),
        providerName: this.name,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        gpa: null,
        gpaScale: null,
        term: null,
        confidence: 0,
        raw,
        processingMs: Date.now() - start,
        matchesClaimed: false,
        providerName: this.name,
        error: message.slice(0, 500),
      };
    }
  }
}

// ---------------------------------------------------------------------------
// Google Vision provider
// ---------------------------------------------------------------------------

interface GoogleVisionAnnotateResponse {
  responses?: Array<{
    fullTextAnnotation?: { text?: string };
    textAnnotations?: Array<{ description?: string }>;
    error?: { message?: string };
  }>;
}

/**
 * Google Cloud Vision adapter. Uses `DOCUMENT_TEXT_DETECTION` (stronger for
 * dense transcript layouts than plain `TEXT_DETECTION`), then runs a
 * lightweight regex post-pass on the returned text to pull GPA + scale +
 * latest term. Authenticated via a service-account JSON in
 * `GOOGLE_VISION_SERVICE_KEY` (stringified JSON — same pattern many GCP
 * serverless integrations use).
 *
 * The image bytes are fetched server-side and sent inline base64 because
 * Vision's `imageUri` requires a `gs://` URI; our transcripts live in
 * Supabase storage, not GCS.
 */
export class GoogleVisionProvider implements OcrProvider {
  readonly name: OcrProviderName = 'google_vision';

  async extractTranscript(input: OcrExtractionInput): Promise<OcrResult> {
    const serviceKeyRaw = process.env.GOOGLE_VISION_SERVICE_KEY;
    if (!serviceKeyRaw) {
      throw new Error(
        '[hs-nil ocr] GOOGLE_VISION_SERVICE_KEY missing — cannot run GoogleVisionProvider.'
      );
    }

    const start = Date.now();
    let raw: Record<string, unknown> = {};
    try {
      const accessToken = await getGoogleAccessToken(serviceKeyRaw);
      const bytes = await fetchSignedUrlAsBase64(input.signedUrl);

      const res = await fetch(
        'https://vision.googleapis.com/v1/images:annotate',
        {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            requests: [
              {
                image: { content: bytes },
                features: [{ type: 'DOCUMENT_TEXT_DETECTION' }],
              },
            ],
          }),
        }
      );

      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(
          `Google Vision ${res.status}: ${body.slice(0, 500) || res.statusText}`
        );
      }

      const json = (await res.json()) as GoogleVisionAnnotateResponse;
      raw = json as Record<string, unknown>;
      const first = json.responses?.[0];
      if (first?.error?.message) {
        throw new Error(`Google Vision error: ${first.error.message}`);
      }
      const fullText =
        first?.fullTextAnnotation?.text ??
        first?.textAnnotations?.[0]?.description ??
        '';

      const parsed = extractGpaFromText(fullText);

      return {
        gpa: parsed.gpa,
        gpaScale: parsed.gpaScale,
        term: parsed.term,
        confidence: parsed.confidence,
        raw,
        processingMs: Date.now() - start,
        matchesClaimed: computeMatchesClaimed(
          parsed.gpa,
          parsed.gpaScale,
          input.claimedGpa
        ),
        providerName: this.name,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        gpa: null,
        gpaScale: null,
        term: null,
        confidence: 0,
        raw,
        processingMs: Date.now() - start,
        matchesClaimed: false,
        providerName: this.name,
        error: message.slice(0, 500),
      };
    }
  }
}

// ---------------------------------------------------------------------------
// Selection
// ---------------------------------------------------------------------------

/**
 * Resolve the OCR provider from env. Fail-closed: defaults to the stub,
 * which itself throws in production so a missing env var surfaces loudly.
 */
export function getOcrProvider(
  override?: OcrProviderName
): OcrProvider {
  const raw =
    override ?? (process.env.OCR_PROVIDER as string | undefined) ?? 'stub';
  // Accept both the canonical DB enum names and the shorter env-friendly
  // aliases ('openai', 'google').
  switch (raw) {
    case 'openai':
    case 'openai_vision':
      return new OpenAiVisionProvider();
    case 'google':
    case 'google_vision':
      return new GoogleVisionProvider();
    case 'stub':
    default:
      return new StubOcrProvider();
  }
}

// ---------------------------------------------------------------------------
// Parsing helpers (non-exported)
// ---------------------------------------------------------------------------

function safeParseJson(input: string): Record<string, unknown> {
  if (!input) return {};
  try {
    const obj = JSON.parse(input);
    return typeof obj === 'object' && obj !== null
      ? (obj as Record<string, unknown>)
      : {};
  } catch {
    // Attempt to strip a leading ```json fence if the model slipped.
    const stripped = input.replace(/^```(?:json)?\s*/i, '').replace(/```$/i, '');
    try {
      const obj = JSON.parse(stripped);
      return typeof obj === 'object' && obj !== null
        ? (obj as Record<string, unknown>)
        : {};
    } catch {
      return {};
    }
  }
}

function pickNumber(
  obj: Record<string, unknown>,
  key: string
): number | null {
  const v = obj[key];
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function pickScale(
  obj: Record<string, unknown>,
  key: string
): number | null {
  const n = pickNumber(obj, key);
  if (n === 4.0 || n === 5.0) return n;
  return null;
}

function pickString(
  obj: Record<string, unknown>,
  key: string
): string | null {
  const v = obj[key];
  if (typeof v === 'string' && v.trim().length > 0) return v.trim();
  return null;
}

function clamp01(n: number | null): number {
  if (n === null || !Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

// ---------------------------------------------------------------------------
// Google Vision regex extraction
// ---------------------------------------------------------------------------

interface TextExtraction {
  gpa: number | null;
  gpaScale: number | null;
  term: string | null;
  confidence: number;
}

/**
 * Pull a cumulative GPA + scale + term out of raw OCR text. Heuristics are
 * starter-grade on purpose; ops can tighten as we see real transcripts.
 *   - "Cumulative GPA: 3.87 / 4.0"       → 3.87 @ 4.0
 *   - "Weighted GPA 4.62 (5.00 scale)"   → 4.62 @ 5.0
 *   - "GPA: 3.92"                        → 3.92 @ 4.0 (default)
 * Confidence starts at 0.75 when we get an explicit scale, 0.55 when
 * scale is inferred. Failure to find any GPA returns confidence 0.
 */
function extractGpaFromText(text: string): TextExtraction {
  if (!text || typeof text !== 'string') {
    return { gpa: null, gpaScale: null, term: null, confidence: 0 };
  }
  const lc = text.toLowerCase();

  // Prefer cumulative/weighted/unweighted labels over raw "GPA".
  const labelled =
    /(cumulative|weighted|unweighted|overall)[^\n]{0,40}?gpa[^\n]{0,20}?([0-5]\.\d{1,3})(?:\s*(?:\/|out of|on a)\s*([45])(?:\.\d)?)?/i;
  const bare =
    /gpa[^\n]{0,20}?([0-5]\.\d{1,3})(?:\s*(?:\/|out of|on a)\s*([45])(?:\.\d)?)?/i;

  const m1 = text.match(labelled);
  const m2 = m1 ? null : text.match(bare);
  const m = m1 ?? m2;

  let gpa: number | null = null;
  let scaleExplicit: number | null = null;
  if (m) {
    const matched = m1 ? Number(m[2]) : Number(m[1]);
    const scaleRaw = m1 ? m[3] : m[2];
    if (Number.isFinite(matched)) gpa = matched;
    if (scaleRaw === '4') scaleExplicit = 4.0;
    if (scaleRaw === '5') scaleExplicit = 5.0;
  }

  let scale: number | null = scaleExplicit;
  if (gpa !== null && scale === null) {
    // Heuristic: GPAs above 4.0 imply a 5.0 scale; otherwise default to 4.0.
    scale = gpa > 4.0 ? 5.0 : 4.0;
  }

  // Term hint: look for "Fall|Spring|Winter|Summer YYYY".
  const termMatch = text.match(/\b(Fall|Spring|Winter|Summer)\s+(\d{4})\b/);
  const term = termMatch ? `${termMatch[1]} ${termMatch[2]}` : null;

  let confidence = 0;
  if (gpa !== null) {
    confidence = scaleExplicit !== null ? 0.75 : 0.55;
    if (lc.includes('cumulative')) confidence += 0.1;
    if (term) confidence += 0.05;
    if (confidence > 0.95) confidence = 0.95; // regex-only extractions never claim >0.95
  }

  return { gpa, gpaScale: scale, term, confidence };
}

// ---------------------------------------------------------------------------
// Google service-account JWT → access token
// ---------------------------------------------------------------------------

interface ServiceAccountKey {
  client_email: string;
  private_key: string;
  token_uri?: string;
}

/**
 * Exchange a service-account JSON for a short-lived access token. Uses the
 * OAuth 2.0 JWT assertion flow. Implementation avoids adding googleapis /
 * google-auth-library — the surface we need is one signed JWT + one
 * form POST.
 */
async function getGoogleAccessToken(serviceKeyRaw: string): Promise<string> {
  const key = parseServiceAccount(serviceKeyRaw);
  const { createSign } = await import('node:crypto');

  const now = Math.floor(Date.now() / 1000);
  const tokenUri = key.token_uri || 'https://oauth2.googleapis.com/token';
  const header = { alg: 'RS256', typ: 'JWT' };
  const claims = {
    iss: key.client_email,
    scope: 'https://www.googleapis.com/auth/cloud-vision',
    aud: tokenUri,
    exp: now + 3600,
    iat: now,
  };

  const encode = (obj: unknown): string =>
    Buffer.from(JSON.stringify(obj))
      .toString('base64')
      .replace(/=+$/, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

  const unsigned = `${encode(header)}.${encode(claims)}`;
  const signer = createSign('RSA-SHA256');
  signer.update(unsigned);
  signer.end();
  const signature = signer
    .sign(key.private_key)
    .toString('base64')
    .replace(/=+$/, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  const jwt = `${unsigned}.${signature}`;

  const res = await fetch(tokenUri, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }).toString(),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(
      `Google token exchange failed (${res.status}): ${body.slice(0, 300)}`
    );
  }
  const json = (await res.json()) as { access_token?: string };
  if (!json.access_token) {
    throw new Error('Google token exchange returned no access_token.');
  }
  return json.access_token;
}

function parseServiceAccount(raw: string): ServiceAccountKey {
  try {
    const obj = JSON.parse(raw) as Partial<ServiceAccountKey>;
    if (!obj.client_email || !obj.private_key) {
      throw new Error('missing client_email or private_key');
    }
    return {
      client_email: obj.client_email,
      private_key: obj.private_key,
      token_uri: obj.token_uri,
    };
  } catch (err) {
    throw new Error(
      `GOOGLE_VISION_SERVICE_KEY is not valid JSON: ${err instanceof Error ? err.message : 'parse error'}`
    );
  }
}

async function fetchSignedUrlAsBase64(signedUrl: string): Promise<string> {
  const res = await fetch(signedUrl);
  if (!res.ok) {
    throw new Error(
      `Failed to fetch transcript from signed URL (${res.status}).`
    );
  }
  const buf = Buffer.from(await res.arrayBuffer());
  return buf.toString('base64');
}
