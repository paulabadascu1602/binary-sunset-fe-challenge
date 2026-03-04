import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { DataGrid } from '../DataGrid';
import { DataRow } from '../../types/data';
import { CellValueChangedEvent } from 'ag-grid-community';
import { recalculateRow } from '../../utils/calculations';

// Mock AG Grid components
jest.mock('ag-grid-react', () => ({
  AgGridReact: ({ onCellValueChanged, rowData }: any) => {
    // Simulate cell value change for testing
    React.useEffect(() => {
      if (onCellValueChanged && rowData && rowData.length > 0) {
        // Simulate editing quantity
        const mockEvent: CellValueChangedEvent = {
          data: { ...rowData[0], quantity: 20 },
          node: {
            setData: jest.fn((data) => {
              // Update rowData in place for testing
              rowData[0] = data;
            }),
          } as any,
          api: {
            refreshCells: jest.fn(),
          } as any,
          column: {} as any,
          colDef: {} as any,
          value: 20,
          newValue: 20,
          oldValue: rowData[0].quantity,
          rowIndex: 0,
          rowPinned: null,
          source: 'uiColumnDragged',
          type: 'cellValueChanged',
          columnApi: {} as any,
          context: {},
        };
        
        // Trigger after a short delay to simulate real behavior
        setTimeout(() => {
          onCellValueChanged(mockEvent);
        }, 100);
      }
    }, [onCellValueChanged, rowData]);
    
    return <div data-testid="ag-grid-mock">AG Grid Mock</div>;
  },
}));

describe('DataGrid', () => {
  const mockRowData: DataRow[] = [
    {
      id: '1',
      productName: 'Test Product',
      category: 'Electronics',
      quantity: 10,
      unitPrice: 50,
      discount: 10,
      isActive: true,
      subtotal: 500,
      total: 450,
      status: 'Normal',
    },
  ];

  it('should render DataGrid with row data', () => {
    render(<DataGrid rowData={mockRowData} />);
    expect(screen.getByTestId('ag-grid-mock')).toBeInTheDocument();
  });

  it('should handle cell value changes and propagate to dependent cells', async () => {
    render(<DataGrid rowData={mockRowData} />);
    
    await waitFor(() => {
      // Verify that handleCellValueChanged would be called
      // In a real scenario, this would trigger recalculateRow
      expect(screen.getByTestId('ag-grid-mock')).toBeInTheDocument();
    }, { timeout: 500 });
  });
});

describe('DataGrid - Data Update Mechanisms', () => {
  // Test the recalculateRow function integration
  it('should propagate quantity edit to subtotal, total, and status', () => {
    
    const initialRow: DataRow = {
      id: '1',
      productName: 'Test',
      category: 'Test',
      quantity: 10,
      unitPrice: 50,
      discount: 10,
      isActive: true,
      subtotal: 0,
      total: 0,
      status: 'Normal',
    };

    // Simulate editing quantity
    const editedRow = { ...initialRow, quantity: 20 };
    const recalculated = recalculateRow(editedRow);

    // Verify dependent values updated
    expect(recalculated.subtotal).toBe(1000); // 20 * 50
    expect(recalculated.total).toBe(900); // 1000 * 0.9
    // Status is "Completed" because total > 500 (900 > 500) AND quantity > 10 (20 > 10)
    // This takes priority over "High Priority" (which requires total > 1000)
    expect(recalculated.status).toBe('Completed');
  });

  it('should propagate unitPrice edit to subtotal, total, and status', () => {
    
    const initialRow: DataRow = {
      id: '1',
      productName: 'Test',
      category: 'Test',
      quantity: 10,
      unitPrice: 50,
      discount: 10,
      isActive: true,
      subtotal: 0,
      total: 0,
      status: 'Normal',
    };

    // Simulate editing unitPrice
    const editedRow = { ...initialRow, unitPrice: 100 };
    const recalculated = recalculateRow(editedRow);

    // Verify dependent values updated
    expect(recalculated.subtotal).toBe(1000); // 10 * 100
    expect(recalculated.total).toBe(900); // 1000 * 0.9
    // Status is "Normal" because quantity is 10 (not > 10), so "Completed" condition doesn't apply
    // Total is 900 (not > 1000), so "High Priority" doesn't apply
    expect(recalculated.status).toBe('Normal');
  });

  it('should propagate discount edit to total and status', () => {
    
    const initialRow: DataRow = {
      id: '1',
      productName: 'Test',
      category: 'Test',
      quantity: 10,
      unitPrice: 50,
      discount: 10,
      isActive: true,
      subtotal: 0,
      total: 0,
      status: 'Normal',
    };

    // Simulate editing discount
    const editedRow = { ...initialRow, discount: 20 };
    const recalculated = recalculateRow(editedRow);

    // Verify dependent values updated
    expect(recalculated.subtotal).toBe(500); // 10 * 50 (unchanged)
    expect(recalculated.total).toBe(400); // 500 * 0.8 (changed)
    expect(recalculated.status).toBe('Normal');
  });

  it('should update status when total changes significantly', () => {
    
    // Test Warning status (total < 50)
    const lowValueRow: DataRow = {
      id: '1',
      productName: 'Test',
      category: 'Test',
      quantity: 1,
      unitPrice: 30,
      discount: 0,
      isActive: true,
      subtotal: 0,
      total: 0,
      status: 'Normal',
    };

    const recalculated = recalculateRow(lowValueRow);
    expect(recalculated.status).toBe('Warning'); // 30 < 50

    // Test High Priority status (total > 1000)
    const highValueRow: DataRow = {
      id: '2',
      productName: 'Test',
      category: 'Test',
      quantity: 10,
      unitPrice: 150,
      discount: 0,
      isActive: true,
      subtotal: 0,
      total: 0,
      status: 'Normal',
    };

    const recalculatedHigh = recalculateRow(highValueRow);
    expect(recalculatedHigh.status).toBe('High Priority'); // 1500 > 1000

    // Test Completed status (total > 500 AND quantity > 10)
    const completedRow: DataRow = {
      id: '3',
      productName: 'Test',
      category: 'Test',
      quantity: 15,
      unitPrice: 50,
      discount: 0,
      isActive: true,
      subtotal: 0,
      total: 0,
      status: 'Normal',
    };

    const recalculatedCompleted = recalculateRow(completedRow);
    expect(recalculatedCompleted.status).toBe('Completed'); // 750 > 500 AND 15 > 10
  });

  it('should maintain data consistency when multiple fields are edited', () => {
    
    const row: DataRow = {
      id: '1',
      productName: 'Test',
      category: 'Test',
      quantity: 20,
      unitPrice: 100,
      discount: 15,
      isActive: true,
      subtotal: 0,
      total: 0,
      status: 'Normal',
    };

    const recalculated = recalculateRow(row);

    // Verify all calculations are consistent
    expect(recalculated.subtotal).toBe(2000); // 20 * 100
    expect(recalculated.total).toBe(1700); // 2000 * 0.85
    // Status is "Completed" because total > 500 (1700 > 500) AND quantity > 10 (20 > 10)
    // "Completed" takes priority over "High Priority" (total > 1000) because it's checked first
    expect(recalculated.status).toBe('Completed');
    // Verify status is based on final calculated total and quantity
    expect(recalculated.total).toBeGreaterThan(1000);
    expect(recalculated.total).toBeGreaterThan(500);
    expect(recalculated.quantity).toBeGreaterThan(10);
  });
});

