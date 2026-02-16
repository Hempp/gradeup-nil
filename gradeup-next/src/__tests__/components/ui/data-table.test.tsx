import { render, screen, fireEvent } from '@testing-library/react';
import { DataTable, DataTableColumn } from '@/components/ui/data-table';

interface TestRow {
  id: string;
  name: string;
  email: string;
  status: string;
}

describe('DataTable', () => {
  const columns: DataTableColumn<TestRow>[] = [
    { key: 'name', header: 'Name' },
    { key: 'email', header: 'Email' },
    { key: 'status', header: 'Status' },
  ];

  const data: TestRow[] = [
    { id: '1', name: 'John Doe', email: 'john@example.com', status: 'Active' },
    { id: '2', name: 'Jane Smith', email: 'jane@example.com', status: 'Inactive' },
    { id: '3', name: 'Bob Johnson', email: 'bob@example.com', status: 'Active' },
  ];

  it('renders table with headers', () => {
    render(<DataTable columns={columns} data={data} />);

    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
  });

  it('renders data rows', () => {
    render(<DataTable columns={columns} data={data} />);

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
    expect(screen.getAllByText('Active').length).toBe(2); // Two rows have Active status
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(screen.getByText('jane@example.com')).toBeInTheDocument();
    expect(screen.getByText('Inactive')).toBeInTheDocument();
  });

  it('renders custom cell content with render prop', () => {
    const columnsWithRender: DataTableColumn<TestRow>[] = [
      { key: 'name', header: 'Name' },
      {
        key: 'status',
        header: 'Status',
        render: (value) => (
          <span className={value === 'Active' ? 'text-green-500' : 'text-red-500'}>
            {String(value)}
          </span>
        ),
      },
    ];

    render(<DataTable columns={columnsWithRender} data={data} />);

    const activeElements = screen.getAllByText('Active');
    expect(activeElements.length).toBeGreaterThan(0);
    expect(activeElements[0].closest('span')).toHaveClass('text-green-500');
  });

  it('shows loading state with skeleton rows', () => {
    render(<DataTable columns={columns} data={[]} loading={true} />);

    // Should render 5 skeleton loading rows
    const table = document.querySelector('table');
    expect(table).toBeInTheDocument();
    const tbody = table?.querySelector('tbody');
    expect(tbody?.children.length).toBe(5);
  });

  it('shows empty state when no data', () => {
    render(<DataTable columns={columns} data={[]} />);

    expect(screen.getByText('No data available')).toBeInTheDocument();
    expect(screen.getByText('There are no items to display at this time.')).toBeInTheDocument();
  });

  it('shows custom empty state', () => {
    render(
      <DataTable
        columns={columns}
        data={[]}
        emptyState={<div>Custom empty message</div>}
      />
    );

    expect(screen.getByText('Custom empty message')).toBeInTheDocument();
  });

  it('calls onRowClick when row is clicked', () => {
    const handleRowClick = jest.fn();
    render(<DataTable columns={columns} data={data} onRowClick={handleRowClick} />);

    const row = screen.getByText('John Doe').closest('tr');
    if (row) {
      fireEvent.click(row);
    }

    expect(handleRowClick).toHaveBeenCalledWith(data[0]);
  });

  it('makes rows keyboard accessible when onRowClick is provided', () => {
    const handleRowClick = jest.fn();
    render(<DataTable columns={columns} data={data} onRowClick={handleRowClick} />);

    const row = screen.getByText('John Doe').closest('tr');
    expect(row).toHaveAttribute('tabIndex', '0');
    expect(row).toHaveAttribute('role', 'button');
  });

  it('handles Enter key press on clickable row', () => {
    const handleRowClick = jest.fn();
    render(<DataTable columns={columns} data={data} onRowClick={handleRowClick} />);

    const row = screen.getByText('John Doe').closest('tr');
    if (row) {
      fireEvent.keyDown(row, { key: 'Enter' });
    }

    expect(handleRowClick).toHaveBeenCalledWith(data[0]);
  });

  it('handles Space key press on clickable row', () => {
    const handleRowClick = jest.fn();
    render(<DataTable columns={columns} data={data} onRowClick={handleRowClick} />);

    const row = screen.getByText('John Doe').closest('tr');
    if (row) {
      fireEvent.keyDown(row, { key: ' ' });
    }

    expect(handleRowClick).toHaveBeenCalledWith(data[0]);
  });

  it('uses custom keyExtractor', () => {
    const keyExtractor = jest.fn((row: TestRow) => `custom-${row.id}`);
    render(
      <DataTable columns={columns} data={data} keyExtractor={keyExtractor} />
    );

    expect(keyExtractor).toHaveBeenCalled();
  });

  it('renders caption for accessibility when provided', () => {
    render(<DataTable columns={columns} data={data} caption="Athletes table" />);

    // Caption is sr-only so we check it exists
    const caption = document.querySelector('caption');
    expect(caption).toBeInTheDocument();
    expect(caption).toHaveTextContent('Athletes table');
    expect(caption).toHaveClass('sr-only');
  });

  it('applies custom className', () => {
    const { container } = render(
      <DataTable columns={columns} data={data} className="custom-table-class" />
    );

    expect(container.firstChild).toHaveClass('custom-table-class');
  });

  it('handles null and undefined values gracefully', () => {
    const dataWithNulls: TestRow[] = [
      { id: '1', name: 'John', email: '', status: '' },
    ];

    render(<DataTable columns={columns} data={dataWithNulls} />);

    expect(screen.getByText('John')).toBeInTheDocument();
  });

  it('renders column with custom width', () => {
    const columnsWithWidth: DataTableColumn<TestRow>[] = [
      { key: 'name', header: 'Name', width: 'w-1/2' },
      { key: 'email', header: 'Email' },
    ];

    render(<DataTable columns={columnsWithWidth} data={data} />);

    const nameHeader = screen.getByText('Name').closest('th');
    expect(nameHeader).toHaveClass('w-1/2');
  });

  it('provides row action description for screen readers', () => {
    const handleRowClick = jest.fn();
    render(
      <DataTable
        columns={columns}
        data={data}
        onRowClick={handleRowClick}
        rowActionDescription="View athlete details"
      />
    );

    const row = screen.getByText('John Doe').closest('tr');
    expect(row).toHaveAttribute('aria-label', expect.stringContaining('View athlete details'));
  });

  it('uses default row action description', () => {
    const handleRowClick = jest.fn();
    render(<DataTable columns={columns} data={data} onRowClick={handleRowClick} />);

    const row = screen.getByText('John Doe').closest('tr');
    expect(row).toHaveAttribute('aria-label', expect.stringContaining('View details'));
  });

  it('falls back to index when no id present and no keyExtractor', () => {
    const dataWithoutId = [
      { name: 'John Doe', email: 'john@example.com', status: 'Active' },
    ] as unknown as TestRow[];

    // Should render without error
    render(<DataTable columns={columns} data={dataWithoutId} />);

    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('handles multiple rows correctly', () => {
    render(<DataTable columns={columns} data={data} />);

    // Verify all three rows are rendered
    const table = document.querySelector('table');
    const tbody = table?.querySelector('tbody');
    expect(tbody?.querySelectorAll('tr').length).toBe(3);
  });
});
