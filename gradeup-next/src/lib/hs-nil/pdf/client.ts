/**
 * HS-NIL PDF — client wrapper
 * ----------------------------------------------------------------------------
 * Thin wrapper that initializes jsPDF with consistent GradeUp brand fonts,
 * margins, and colors, and re-exports the document-builder helpers from
 * shared.ts. Import from here so individual report builders don't reach
 * into shared.ts directly — keeping a single public surface gives us room
 * to swap jsPDF for another engine later without touching callers.
 *
 * `createBrandedDocument()` is the only function most callers need. It
 * returns a jsPDF instance pre-configured with the default font family,
 * text colour, and line style in effect.
 */
import { jsPDF } from 'jspdf';
import {
  COLORS,
  FONTS,
  MARGINS,
  newDocument,
  setText,
  drawHeader,
  drawRule,
  drawFooter,
  drawBrandMark,
  drawStatBlock,
  drawTable,
  drawWrappedText,
  stampFootersOnAllPages,
  slugify,
  today,
  maskAthleteName,
  toBuffer,
  PAGE_WIDTH_MM,
  PAGE_HEIGHT_MM,
  CONTENT_WIDTH,
  type TableColumn,
} from './shared';

export {
  COLORS,
  FONTS,
  MARGINS,
  setText,
  drawHeader,
  drawRule,
  drawFooter,
  drawBrandMark,
  drawStatBlock,
  drawTable,
  drawWrappedText,
  stampFootersOnAllPages,
  slugify,
  today,
  maskAthleteName,
  toBuffer,
  PAGE_WIDTH_MM,
  PAGE_HEIGHT_MM,
  CONTENT_WIDTH,
};
export type { TableColumn };

/**
 * Start a new GradeUp-branded PDF document.
 *
 * Configured as: letter-sized, portrait, Helvetica, dark-text-on-white,
 * with compressible streams enabled. Callers should use the drawing
 * helpers re-exported from this module rather than jsPDF directly so the
 * house style stays consistent.
 */
export function createBrandedDocument(): jsPDF {
  return newDocument();
}
