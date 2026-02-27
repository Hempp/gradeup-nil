/**
 * CSV Parser Utility
 *
 * Provides robust CSV parsing functionality for bulk athlete imports.
 * Supports both CSV and Excel-style CSV formats with proper handling of:
 * - Quoted fields with embedded commas, newlines, and quotes
 * - Various line endings (CRLF, LF, CR)
 * - Header row detection and column mapping
 * - Data validation and error reporting
 */

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Raw parsed row before column mapping
 */
export interface RawRow {
  rowIndex: number;
  values: string[];
}

/**
 * Parsed athlete data from CSV
 */
export interface ParsedAthleteRow {
  rowIndex: number;
  data: {
    first_name?: string;
    last_name?: string;
    email?: string;
    sport?: string;
    position?: string;
    year?: string;
    gpa?: number;
    school_id?: string;
    jersey_number?: string;
    major?: string;
    hometown?: string;
    height_inches?: number;
    weight_lbs?: number;
  };
  errors: string[];
  isValid: boolean;
}

/**
 * Column mapping from CSV headers to athlete fields
 */
export interface ColumnMapping {
  [csvColumn: string]: keyof ParsedAthleteRow['data'] | null;
}

/**
 * CSV parsing result
 */
export interface CSVParseResult {
  success: boolean;
  headers: string[];
  rows: RawRow[];
  totalRows: number;
  error?: string;
}

/**
 * Validated import result
 */
export interface ValidatedImportResult {
  validRows: ParsedAthleteRow[];
  invalidRows: ParsedAthleteRow[];
  totalRows: number;
  validCount: number;
  invalidCount: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Valid academic years for validation
 */
export const VALID_ACADEMIC_YEARS = [
  'freshman',
  'sophomore',
  'junior',
  'senior',
  'graduate',
  'redshirt_freshman',
  'redshirt_sophomore',
  'redshirt_junior',
  'redshirt_senior',
];

/**
 * Normalized year mappings from common variations
 */
const YEAR_NORMALIZATIONS: Record<string, string> = {
  'fr': 'freshman',
  'fr.': 'freshman',
  'fresh': 'freshman',
  'freshman': 'freshman',
  'so': 'sophomore',
  'so.': 'sophomore',
  'soph': 'sophomore',
  'sophomore': 'sophomore',
  'jr': 'junior',
  'jr.': 'junior',
  'jun': 'junior',
  'junior': 'junior',
  'sr': 'senior',
  'sr.': 'senior',
  'sen': 'senior',
  'senior': 'senior',
  'gr': 'graduate',
  'grad': 'graduate',
  'graduate': 'graduate',
  'rs fr': 'redshirt_freshman',
  'rs freshman': 'redshirt_freshman',
  'redshirt freshman': 'redshirt_freshman',
  'redshirt_freshman': 'redshirt_freshman',
  'rs so': 'redshirt_sophomore',
  'rs sophomore': 'redshirt_sophomore',
  'redshirt sophomore': 'redshirt_sophomore',
  'redshirt_sophomore': 'redshirt_sophomore',
  'rs jr': 'redshirt_junior',
  'rs junior': 'redshirt_junior',
  'redshirt junior': 'redshirt_junior',
  'redshirt_junior': 'redshirt_junior',
  'rs sr': 'redshirt_senior',
  'rs senior': 'redshirt_senior',
  'redshirt senior': 'redshirt_senior',
  'redshirt_senior': 'redshirt_senior',
};

/**
 * Common column header variations for auto-mapping
 */
export const HEADER_MAPPINGS: Record<string, keyof ParsedAthleteRow['data']> = {
  // First name variations
  'first_name': 'first_name',
  'firstname': 'first_name',
  'first': 'first_name',
  'fname': 'first_name',
  'given_name': 'first_name',
  'given name': 'first_name',
  // Last name variations
  'last_name': 'last_name',
  'lastname': 'last_name',
  'last': 'last_name',
  'lname': 'last_name',
  'surname': 'last_name',
  'family_name': 'last_name',
  'family name': 'last_name',
  // Email variations
  'email': 'email',
  'e-mail': 'email',
  'email_address': 'email',
  'email address': 'email',
  // Sport variations
  'sport': 'sport',
  'sports': 'sport',
  'sport_name': 'sport',
  'sport name': 'sport',
  // Position variations
  'position': 'position',
  'pos': 'position',
  'playing_position': 'position',
  // Year variations
  'year': 'year',
  'academic_year': 'year',
  'academic year': 'year',
  'class': 'year',
  'class_year': 'year',
  'class year': 'year',
  'grade': 'year',
  'eligibility': 'year',
  // GPA variations
  'gpa': 'gpa',
  'grade_point_average': 'gpa',
  'grade point average': 'gpa',
  // School ID variations
  'school_id': 'school_id',
  'schoolid': 'school_id',
  'school': 'school_id',
  // Jersey number variations
  'jersey_number': 'jersey_number',
  'jersey': 'jersey_number',
  'number': 'jersey_number',
  'uniform_number': 'jersey_number',
  'no': 'jersey_number',
  '#': 'jersey_number',
  // Major variations
  'major': 'major',
  'field_of_study': 'major',
  'degree': 'major',
  // Hometown variations
  'hometown': 'hometown',
  'home_town': 'hometown',
  'city': 'hometown',
  'origin': 'hometown',
  // Height variations
  'height_inches': 'height_inches',
  'height': 'height_inches',
  'ht': 'height_inches',
  // Weight variations
  'weight_lbs': 'weight_lbs',
  'weight': 'weight_lbs',
  'wt': 'weight_lbs',
};

// ═══════════════════════════════════════════════════════════════════════════
// CSV PARSING FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Parse a CSV string into rows and columns
 * Handles quoted fields, embedded commas, and various line endings
 */
export function parseCSV(content: string): CSVParseResult {
  try {
    // Normalize line endings
    const normalizedContent = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    // Parse the CSV content
    const rows: string[][] = [];
    let currentRow: string[] = [];
    let currentField = '';
    let inQuotes = false;
    let i = 0;

    while (i < normalizedContent.length) {
      const char = normalizedContent[i];
      const nextChar = normalizedContent[i + 1];

      if (inQuotes) {
        if (char === '"') {
          if (nextChar === '"') {
            // Escaped quote
            currentField += '"';
            i += 2;
            continue;
          } else {
            // End of quoted field
            inQuotes = false;
            i++;
            continue;
          }
        } else {
          currentField += char;
          i++;
          continue;
        }
      }

      // Not in quotes
      if (char === '"') {
        inQuotes = true;
        i++;
        continue;
      }

      if (char === ',') {
        currentRow.push(currentField.trim());
        currentField = '';
        i++;
        continue;
      }

      if (char === '\n') {
        currentRow.push(currentField.trim());
        if (currentRow.some(field => field !== '')) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentField = '';
        i++;
        continue;
      }

      currentField += char;
      i++;
    }

    // Handle last field and row
    if (currentField || currentRow.length > 0) {
      currentRow.push(currentField.trim());
      if (currentRow.some(field => field !== '')) {
        rows.push(currentRow);
      }
    }

    if (rows.length === 0) {
      return {
        success: false,
        headers: [],
        rows: [],
        totalRows: 0,
        error: 'No data found in CSV file',
      };
    }

    // First row is headers
    const headers = rows[0].map(h => h.toLowerCase().trim());
    const dataRows: RawRow[] = rows.slice(1).map((values, index) => ({
      rowIndex: index + 2, // +2 because we skip header (1) and arrays are 0-indexed
      values,
    }));

    return {
      success: true,
      headers,
      rows: dataRows,
      totalRows: dataRows.length,
    };
  } catch (error) {
    return {
      success: false,
      headers: [],
      rows: [],
      totalRows: 0,
      error: error instanceof Error ? error.message : 'Failed to parse CSV content',
    };
  }
}

/**
 * Auto-detect column mappings based on header names
 */
export function autoDetectColumnMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};

  for (const header of headers) {
    const normalizedHeader = header.toLowerCase().trim().replace(/\s+/g, '_');

    // Check for exact match first
    if (HEADER_MAPPINGS[normalizedHeader]) {
      mapping[header] = HEADER_MAPPINGS[normalizedHeader];
      continue;
    }

    // Check for partial matches
    const matchingKey = Object.keys(HEADER_MAPPINGS).find(key =>
      normalizedHeader.includes(key) || key.includes(normalizedHeader)
    );

    if (matchingKey) {
      mapping[header] = HEADER_MAPPINGS[matchingKey];
    } else {
      mapping[header] = null; // Unknown column
    }
  }

  return mapping;
}

/**
 * Normalize academic year to standard format
 */
export function normalizeAcademicYear(year: string): string | null {
  const normalized = year.toLowerCase().trim();
  return YEAR_NORMALIZATIONS[normalized] || null;
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Parse height string to inches (supports formats like "6'2\"", "74", "6-2")
 */
export function parseHeight(height: string): number | null {
  if (!height || height.trim() === '') return null;

  const trimmed = height.trim();

  // Already in inches (just a number)
  if (/^\d+$/.test(trimmed)) {
    const inches = parseInt(trimmed, 10);
    return inches >= 36 && inches <= 108 ? inches : null;
  }

  // Format: 6'2" or 6'2 or 6-2
  const feetInchesRegex = /^(\d+)['\-]?\s*(\d+)?["']?$/;
  const match = trimmed.match(feetInchesRegex);

  if (match) {
    const feet = parseInt(match[1], 10);
    const inches = match[2] ? parseInt(match[2], 10) : 0;
    const totalInches = feet * 12 + inches;
    return totalInches >= 36 && totalInches <= 108 ? totalInches : null;
  }

  return null;
}

/**
 * Parse weight string to pounds (removes "lbs" suffix if present)
 */
export function parseWeight(weight: string): number | null {
  if (!weight || weight.trim() === '') return null;

  const trimmed = weight.trim().toLowerCase().replace(/lbs?\.?$/i, '').trim();
  const parsed = parseInt(trimmed, 10);

  return !isNaN(parsed) && parsed >= 50 && parsed <= 500 ? parsed : null;
}

/**
 * Parse GPA string to number (handles various formats)
 */
export function parseGPA(gpa: string): number | null {
  if (!gpa || gpa.trim() === '') return null;

  const parsed = parseFloat(gpa.trim());

  return !isNaN(parsed) && parsed >= 0 && parsed <= 4.0 ? Math.round(parsed * 100) / 100 : null;
}

// ═══════════════════════════════════════════════════════════════════════════
// VALIDATION AND MAPPING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Apply column mapping to raw rows and validate data
 */
export function mapAndValidateRows(
  headers: string[],
  rows: RawRow[],
  columnMapping: ColumnMapping,
  existingEmails: Set<string> = new Set()
): ValidatedImportResult {
  const validRows: ParsedAthleteRow[] = [];
  const invalidRows: ParsedAthleteRow[] = [];
  const seenEmails = new Set<string>();

  for (const row of rows) {
    const errors: string[] = [];
    const data: ParsedAthleteRow['data'] = {};

    // Map columns to data
    headers.forEach((header, index) => {
      const fieldName = columnMapping[header];
      const value = row.values[index] || '';

      if (fieldName && value) {
        switch (fieldName) {
          case 'first_name':
          case 'last_name':
          case 'position':
          case 'major':
          case 'hometown':
          case 'jersey_number':
          case 'school_id':
            data[fieldName] = value.trim();
            break;
          case 'email':
            data.email = value.trim().toLowerCase();
            break;
          case 'sport':
            data.sport = value.trim();
            break;
          case 'year': {
            const normalizedYear = normalizeAcademicYear(value);
            if (normalizedYear) {
              data.year = normalizedYear;
            } else if (value.trim()) {
              errors.push(`Invalid academic year: "${value}". Must be one of: ${VALID_ACADEMIC_YEARS.join(', ')}`);
            }
            break;
          }
          case 'gpa': {
            const parsedGPA = parseGPA(value);
            if (parsedGPA !== null) {
              data.gpa = parsedGPA;
            } else if (value.trim()) {
              errors.push(`Invalid GPA: "${value}". Must be between 0.0 and 4.0`);
            }
            break;
          }
          case 'height_inches': {
            const parsedHeight = parseHeight(value);
            if (parsedHeight !== null) {
              data.height_inches = parsedHeight;
            } else if (value.trim()) {
              errors.push(`Invalid height: "${value}". Use format like "6'2" or total inches`);
            }
            break;
          }
          case 'weight_lbs': {
            const parsedWeight = parseWeight(value);
            if (parsedWeight !== null) {
              data.weight_lbs = parsedWeight;
            } else if (value.trim()) {
              errors.push(`Invalid weight: "${value}". Must be between 50 and 500 lbs`);
            }
            break;
          }
        }
      }
    });

    // Required field validation
    if (!data.first_name) {
      errors.push('First name is required');
    }
    if (!data.last_name) {
      errors.push('Last name is required');
    }
    if (!data.email) {
      errors.push('Email is required');
    } else if (!isValidEmail(data.email)) {
      errors.push(`Invalid email format: "${data.email}"`);
    } else {
      // Check for duplicate emails within the import
      if (seenEmails.has(data.email)) {
        errors.push(`Duplicate email in import: "${data.email}"`);
      } else {
        seenEmails.add(data.email);
      }
      // Check against existing emails in database
      if (existingEmails.has(data.email)) {
        errors.push(`Email already exists: "${data.email}"`);
      }
    }

    // GPA range validation (additional check)
    if (data.gpa !== undefined && (data.gpa < 0 || data.gpa > 4.0)) {
      errors.push(`GPA must be between 0.0 and 4.0`);
    }

    const parsedRow: ParsedAthleteRow = {
      rowIndex: row.rowIndex,
      data,
      errors,
      isValid: errors.length === 0,
    };

    if (parsedRow.isValid) {
      validRows.push(parsedRow);
    } else {
      invalidRows.push(parsedRow);
    }
  }

  return {
    validRows,
    invalidRows,
    totalRows: rows.length,
    validCount: validRows.length,
    invalidCount: invalidRows.length,
  };
}

/**
 * Get required fields for athlete import
 */
export function getRequiredFields(): (keyof ParsedAthleteRow['data'])[] {
  return ['first_name', 'last_name', 'email'];
}

/**
 * Get optional fields for athlete import
 */
export function getOptionalFields(): (keyof ParsedAthleteRow['data'])[] {
  return ['sport', 'position', 'year', 'gpa', 'school_id', 'jersey_number', 'major', 'hometown', 'height_inches', 'weight_lbs'];
}

/**
 * Get all available fields for mapping
 */
export function getAllFields(): (keyof ParsedAthleteRow['data'])[] {
  return [...getRequiredFields(), ...getOptionalFields()];
}

/**
 * Format field name for display
 */
export function formatFieldName(field: string): string {
  return field
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
