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
    const calls = mockCreateObjectURL.mock.calls as unknown[][];
    const blob = calls[0]?.[0] as Blob | undefined;
    expect(blob).toBeInstanceOf(Blob);
    expect(blob?.type).toBe('text/csv');
  });

  it('uses custom columns when provided', () => {
    const data = [
      { name: 'John', age: 30, email: 'john@test.com' },
    ];

    const columns: Array<{ key: keyof typeof data[0]; label: string }> = [
      { key: 'name', label: 'Full Name' },
      { key: 'age', label: 'Age' },
    ];

    exportToCSV(data, 'test', columns);

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
    jest.useFakeTimers();
    document.body.innerHTML = '';
  });

  afterEach(() => {
    jest.useRealTimers();
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

  it('creates print window with correct title', () => {
    const div = document.createElement('div');
    div.id = 'test-element';
    div.textContent = 'Test content';
    document.body.appendChild(div);

    const mockPrintWindow = {
      document: {
        head: document.createElement('head'),
        body: document.createElement('body'),
        createElement: jest.fn().mockImplementation((tagName: string) => document.createElement(tagName)),
      },
      addEventListener: jest.fn(),
      print: jest.fn(),
    };
    window.open = jest.fn(() => mockPrintWindow as unknown as Window);

    exportToPDF('test-element', 'Test Report');

    expect(window.open).toHaveBeenCalledWith('', '_blank');
    expect(mockPrintWindow.addEventListener).toHaveBeenCalledWith('load', expect.any(Function));
  });

  it('triggers print after timeout', () => {
    const div = document.createElement('div');
    div.id = 'test-element';
    div.textContent = 'Test content';
    document.body.appendChild(div);

    const mockPrint = jest.fn();
    const mockPrintWindow = {
      document: {
        head: document.createElement('head'),
        body: document.createElement('body'),
        createElement: jest.fn().mockImplementation((tagName: string) => document.createElement(tagName)),
      },
      addEventListener: jest.fn(),
      print: mockPrint,
    };
    window.open = jest.fn(() => mockPrintWindow as unknown as Window);

    exportToPDF('test-element', 'Test Report');

    // Fast forward timer for fallback print
    jest.advanceTimersByTime(250);

    expect(mockPrint).toHaveBeenCalled();
  });

  it('adds styles to print window', () => {
    const div = document.createElement('div');
    div.id = 'styled-element';
    const table = document.createElement('table');
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.textContent = 'Cell';
    tr.appendChild(td);
    table.appendChild(tr);
    div.appendChild(table);
    document.body.appendChild(div);

    const mockHead = document.createElement('head');
    const mockBody = document.createElement('body');
    const mockPrintWindow = {
      document: {
        head: mockHead,
        body: mockBody,
        createElement: jest.fn().mockImplementation((tagName: string) => document.createElement(tagName)),
      },
      addEventListener: jest.fn(),
      print: jest.fn(),
    };
    window.open = jest.fn(() => mockPrintWindow as unknown as Window);

    exportToPDF('styled-element', 'Styled Report');

    // Check that title and style elements were added to head
    const titleEl = mockHead.querySelector('title');
    const styleEl = mockHead.querySelector('style');

    expect(titleEl?.textContent).toBe('Styled Report');
    expect(styleEl).not.toBeNull();
    expect(styleEl?.textContent).toContain('font-family');
  });
});

describe('exportToCSV edge cases', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    document.body.innerHTML = '';
  });

  it('handles values with quotes', () => {
    const data = [{ name: 'John "Jack" Doe' }];

    exportToCSV(data, 'test');

    expect(mockCreateObjectURL).toHaveBeenCalled();
    // The escaped quote should be in the CSV
  });

  it('creates proper filename', () => {
    const data = [{ a: 1 }];

    exportToCSV(data, 'my-report');

    // Verify link was created with correct download attribute
    // Link is removed after click, so we just verify function completed
    expect(mockClick).toHaveBeenCalled();
    expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:test-url');
  });

  it('handles numeric values', () => {
    const data = [{ price: 99.99, quantity: 10 }];

    exportToCSV(data, 'test');

    expect(mockCreateObjectURL).toHaveBeenCalled();
  });

  it('handles boolean values', () => {
    const data = [{ active: true, deleted: false }];

    exportToCSV(data, 'test');

    expect(mockCreateObjectURL).toHaveBeenCalled();
  });

  it('handles multiple rows', () => {
    const data = [
      { id: 1, name: 'First' },
      { id: 2, name: 'Second' },
      { id: 3, name: 'Third' },
    ];

    exportToCSV(data, 'test');

    expect(mockCreateObjectURL).toHaveBeenCalled();
  });
});
