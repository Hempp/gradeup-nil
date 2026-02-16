/**
 * Tests for ExportButton component
 * @module __tests__/components/ui/export-button.test
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ExportButton } from '@/components/ui/export-button';

// Mock the export utilities
jest.mock('@/lib/utils/export', () => ({
  exportToCSV: jest.fn(),
  exportToPDF: jest.fn(),
}));

import { exportToCSV, exportToPDF } from '@/lib/utils/export';

describe('ExportButton', () => {
  const mockData = [
    { id: 1, name: 'John', value: 100 },
    { id: 2, name: 'Jane', value: 200 },
  ];

  const mockColumns = [
    { key: 'id' as const, label: 'ID' },
    { key: 'name' as const, label: 'Name' },
    { key: 'value' as const, label: 'Value' },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders CSV export button by default', () => {
    render(<ExportButton data={mockData} filename="test" />);

    expect(screen.getByRole('button', { name: /export csv/i })).toBeInTheDocument();
  });

  it('renders PDF export button when variant is pdf', () => {
    render(<ExportButton data={mockData} filename="test" variant="pdf" />);

    expect(screen.getByRole('button', { name: /export pdf/i })).toBeInTheDocument();
  });

  it('renders both CSV and PDF buttons when variant is both', () => {
    render(<ExportButton data={mockData} filename="test" variant="both" tableId="test-table" />);

    expect(screen.getByRole('button', { name: /csv/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /pdf/i })).toBeInTheDocument();
  });

  it('calls exportToCSV when CSV button is clicked', () => {
    render(<ExportButton data={mockData} filename="test" columns={mockColumns} />);

    const button = screen.getByRole('button', { name: /export csv/i });
    fireEvent.click(button);

    expect(exportToCSV).toHaveBeenCalledWith(mockData, 'test', mockColumns);
  });

  it('calls exportToPDF when PDF button is clicked with tableId', () => {
    render(<ExportButton data={mockData} filename="test" variant="pdf" tableId="test-table" />);

    const button = screen.getByRole('button', { name: /export pdf/i });
    fireEvent.click(button);

    expect(exportToPDF).toHaveBeenCalledWith('test-table', 'test');
  });

  it('disables PDF button when no tableId provided in both variant', () => {
    render(<ExportButton data={mockData} filename="test" variant="both" />);

    const pdfButton = screen.getByRole('button', { name: /pdf/i });
    expect(pdfButton).toBeDisabled();
  });

  it('does not call exportToPDF when tableId is not provided', () => {
    render(<ExportButton data={mockData} filename="test" variant="pdf" />);

    const button = screen.getByRole('button', { name: /export pdf/i });
    fireEvent.click(button);

    expect(exportToPDF).not.toHaveBeenCalled();
  });

  it('handles export completion', () => {
    render(<ExportButton data={mockData} filename="test" />);

    const button = screen.getByRole('button', { name: /export csv/i });
    fireEvent.click(button);

    // Button should still be in the document after export
    expect(button).toBeInTheDocument();
  });
});
