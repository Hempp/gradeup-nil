/**
 * Export utilities for CSV and PDF data export functionality
 */
import DOMPurify from 'dompurify';

/**
 * Convert data to CSV format and trigger download
 */
export function exportToCSV<T extends Record<string, unknown>>(
  data: T[],
  filename: string,
  columns?: { key: keyof T; label: string }[]
) {
  if (!data.length) return;

  const keys = columns ? columns.map((c) => c.key) : (Object.keys(data[0]) as (keyof T)[]);
  const headers = columns ? columns.map((c) => c.label) : keys.map(String);

  const csvContent = [
    headers.join(','),
    ...data.map((row) =>
      keys.map((key) => {
        const value = row[key];
        const str = value === null || value === undefined ? '' : String(value);
        return str.includes(',') || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
      }).join(',')
    ),
  ].join('\n');

  downloadFile(csvContent, `${filename}.csv`, 'text/csv');
}

/**
 * Export data to PDF (uses browser print with sanitized DOM content)
 */
export function exportToPDF(elementId: string, filename: string) {
  const element = document.getElementById(elementId);
  if (!element) return;

  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  // Create document structure using safe DOM methods
  const doc = printWindow.document;

  // Create and append head elements
  const title = doc.createElement('title');
  title.textContent = filename;
  doc.head.appendChild(title);

  const style = doc.createElement('style');
  style.textContent = `
    body { font-family: system-ui, sans-serif; padding: 20px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background: #f5f5f5; }
    @media print { body { padding: 0; } }
  `;
  doc.head.appendChild(style);

  // Sanitize and clone the element content
  const sanitizedContent = DOMPurify.sanitize(element.innerHTML);
  const contentContainer = doc.createElement('div');
  contentContainer.innerHTML = sanitizedContent;
  doc.body.appendChild(contentContainer);

  // Trigger print after content is loaded
  printWindow.addEventListener('load', () => {
    printWindow.print();
  });

  // Fallback for immediate print
  setTimeout(() => {
    printWindow.print();
  }, 250);
}

/**
 * Download a file with the given content
 */
function downloadFile(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
