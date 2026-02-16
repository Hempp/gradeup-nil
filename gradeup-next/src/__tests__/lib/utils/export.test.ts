/**
 * Tests for export utilities
 * @module __tests__/lib/utils/export.test
 */

import { exportToCSV, exportToPDF } from '@/lib/utils/export';

// Mock URL methods
const mockRevokeObjectURL = jest.fn();
const mockCreateObjectURL = jest.fn(() => 'blob:test-url');

global.URL.createObjectURL = mockCreateObjectURL;
global.URL.revokeObjectURL = mockRevokeObjectURL;

// Mock link click
const mockClick = jest.fn();
HTMLAnchorElement.prototype.click = mockClick;

describe('exportToCSV', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    document.body.innerHTML = '';
  });

  it('does nothing with empty data', () => {
    exportToCSV([], 'test');
    expect(mockCreateObjectURL).not.toHaveBeenCalled();
  });

  it('creates CSV with object keys as headers', () => {
    const data = [
      { name: 'John', age: 30 },
      { name: 'Jane', age: 25 },
    ];

    exportToCSV(data, 'test');

    expect(mockCreateObjectURL).toHaveBeenCalled();
    const blob = mockCreateObjectURL.mock.calls[0][0];
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('text/csv');
  });

  it('uses custom columns when provided', () => {
    const data = [
      { name: 'John', age: 30, email: 'john@test.com' },
    ];

    const columns = [
      { key: 'name' as const, label: 'Full Name' },
      { key: 'age' as const, label: 'Age' },
    ];

    exportToCSV(data, columns);

    expect(mockCreateObjectURL).toHaveBeenCalled();
  });

  it('handles values with commas', () => {
    const data = [{ description: 'First, Second' }];

    exportToCSV(data, 'test');

    expect(mockCreateObjectURL).toHaveBeenCalled();
  });

  it('handles null and undefined values', () => {
    const data = [{ a: null, b: undefined, c: 'value' }];

    exportToCSV(data, 'test');

    expect(mockCreateObjectURL).toHaveBeenCalled();
  });
});

describe('exportToPDF', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    document.body.innerHTML = '';
  });

  it('does nothing when element not found', () => {
    const mockOpen = jest.fn();
    window.open = mockOpen;

    exportToPDF('nonexistent', 'test');

    expect(mockOpen).not.toHaveBeenCalled();
  });

  it('handles blocked popup', () => {
    const div = document.createElement('div');
    div.id = 'test-element';
    document.body.appendChild(div);

    window.open = jest.fn(() => null);

    expect(() => exportToPDF('test-element', 'test')).not.toThrow();
  });
});
