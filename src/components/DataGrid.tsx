import React, { useMemo, useCallback, useState, useEffect, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, GridOptions, ValueGetterParams, CellValueChangedEvent, ICellRendererParams, GridApi } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import '../App.css';

import { DataRow } from '../types/data';
import { ChipsRenderer } from './renderers/ChipsRenderer';
import { CalculationRenderer } from './renderers/CalculationRenderer';
import { EditableCellRenderer } from './renderers/EditableCellRenderer';
import { recalculateRow } from '../utils/calculations';

interface DataGridProps {
  rowData: DataRow[];
}

export const DataGrid: React.FC<DataGridProps> = ({ rowData }) => {
  const [data, setData] = useState<DataRow[]>(rowData);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [totalFilterValue, setTotalFilterValue] = useState<string>('');
  const [totalFilterOperator, setTotalFilterOperator] = useState<'greater' | 'less'>('greater');
  const gridApiRef = useRef<GridApi<DataRow> | null>(null);

  // Sync state with prop when rowData changes
  useEffect(() => {
    setData(rowData);
  }, [rowData]);

  // Calculate total for a row (same logic as totalGetter)
  const calculateRowTotal = useCallback((row: DataRow): number => {
    const subtotal = row.quantity * row.unitPrice;
    return subtotal * (1 - (row.discount || 0) / 100);
  }, []);

  // Filter data based on search term (productName and category) and total filter
  const filteredData = useMemo(() => {
    let result = data;

    // Apply search filter
    if (searchTerm.trim()) {
      const lowerSearchTerm = searchTerm.toLowerCase().trim();
      result = result.filter((row) => {
        const productNameMatch = row.productName?.toLowerCase().includes(lowerSearchTerm);
        const categoryMatch = row.category?.toLowerCase().includes(lowerSearchTerm);
        return productNameMatch || categoryMatch;
      });
    }

    // Apply total filter
    if (totalFilterValue.trim()) {
      const filterNumber = parseFloat(totalFilterValue);
      if (!isNaN(filterNumber)) {
        result = result.filter((row) => {
          const rowTotal = calculateRowTotal(row);
          return totalFilterOperator === 'greater' 
            ? rowTotal > filterNumber 
            : rowTotal < filterNumber;
        });
      }
    }

    return result;
  }, [data, searchTerm, totalFilterValue, totalFilterOperator, calculateRowTotal]);

  // Sync filteredData to grid when it changes (after edits or filter changes)
  // This ensures the grid always reflects the latest filtered data
  useEffect(() => {
    if (gridApiRef.current) {
      // Always update with a new array reference to force AG Grid to re-render
      // This is critical when filters change after edits
      gridApiRef.current.setGridOption('rowData', [...filteredData]);
    }
  }, [filteredData]);



  // Memoize value formatters and getters to prevent unnecessary re-renders
  const unitPriceFormatter = useCallback((params: { value?: number }) => {
    return params.value?.toFixed(2) || '0.00';
  }, []);

  const discountFormatter = useCallback((params: { value?: number }) => {
    return params.value?.toFixed(2) || '0.00';
  }, []);

  const currencyFormatter = useCallback((params: { value?: number }) => {
    return `$${params.value?.toFixed(2) || '0.00'}`;
  }, []);

  const subtotalGetter = useCallback((params: ValueGetterParams<DataRow>) => {
    if (!params.data) return 0;
    return params.data.quantity * params.data.unitPrice;
  }, []);

  const totalGetter = useCallback((params: ValueGetterParams<DataRow>) => {
    if (!params.data) return 0;
    const subtotal = params.data.quantity * params.data.unitPrice;
    return subtotal * (1 - (params.data.discount || 0) / 100);
  }, []);

  const statusGetter = useCallback((params: ValueGetterParams<DataRow>) => {
    if (!params.data) return 'Normal';
    const subtotal = params.data.quantity * params.data.unitPrice;
    const total = subtotal * (1 - (params.data.discount || 0) / 100);
    
    // Order matters: check specific conditions before general ones
    if (total < 50) return 'Warning';
    if (!params.data.isActive) return 'Pending';
    // Check Completed before High Priority (more specific condition)
    if (total > 500 && params.data.quantity > 10) return 'Completed';
    if (total > 1000) return 'High Priority';
    return 'Normal';
  }, []);

  const activeCellRenderer = useCallback((params: ICellRendererParams) => {
    return params.value ? '✓' : '✗';
  }, []);

  const handleCellValueChanged = useCallback((event: CellValueChangedEvent<DataRow>) => {
    if (!event.data) return;

    // IMPORTANT: event.data has the OLD values, event.node.data has the NEW values
    // We need to use event.node.data which is updated by EditableCellRenderer
    const currentRowData = event.node.data as DataRow;
    
    if (!currentRowData) {
      // This should never happen since EditableCellRenderer sets node.data before triggering the event
      return;
    }
    
    // Recalculate the row with updated values (subtotal, total, status)
    const updatedRow = recalculateRow(currentRowData);
    
    // Update the row data in AG Grid
    event.node.setData(updatedRow);
    
    // CRITICAL: Update data state IMMEDIATELY to keep it in sync
    // This ensures filteredData recalculates with the new values
    setData((prevData) => {
      const rowId = updatedRow.id;
      // Create a completely new array and new row object to ensure React detects the change
      return prevData.map((row) => 
        row.id === rowId 
          ? { ...updatedRow } // New object reference with all calculated values
          : row
      );
    });
    
    // Refresh cells to show updated calculated values
    event.api.refreshCells({
      rowNodes: [event.node],
      force: true,
    });
  }, []);

  // Memoize cellRendererParams objects
  const quantityParams = useMemo(() => ({ 
    field: 'quantity',
    onCellValueChanged: handleCellValueChanged,
  }), [handleCellValueChanged]);
  const unitPriceParams = useMemo(() => ({ 
    field: 'unitPrice',
    onCellValueChanged: handleCellValueChanged,
  }), [handleCellValueChanged]);
  const discountParams = useMemo(() => ({ 
    field: 'discount',
    onCellValueChanged: handleCellValueChanged,
  }), [handleCellValueChanged]);

  // Memoize column definitions to prevent unnecessary re-renders
  const columnDefs = useMemo<ColDef<DataRow>[]>(
    () => [
      {
        headerName: 'ID',
        field: 'id',
        width: 120,
        pinned: 'left',
        lockPosition: true,
      },
      {
        headerName: 'Product Name',
        field: 'productName',
        width: 200,
        editable: true,
        cellEditor: 'agTextCellEditor',
      },
      {
        headerName: 'Category',
        field: 'category',
        width: 150,
      },
      {
        headerName: 'Quantity',
        field: 'quantity',
        width: 120,
        editable: true,
        cellRenderer: EditableCellRenderer,
        cellRendererParams: quantityParams,
        type: 'numericColumn',
      },
      {
        headerName: 'Unit Price',
        field: 'unitPrice',
        width: 130,
        editable: true,
        cellRenderer: EditableCellRenderer,
        cellRendererParams: unitPriceParams,
        type: 'numericColumn',
        valueFormatter: unitPriceFormatter,
      },
      {
        headerName: 'Discount (%)',
        field: 'discount',
        width: 130,
        editable: true,
        cellRenderer: EditableCellRenderer,
        cellRendererParams: discountParams,
        type: 'numericColumn',
        valueFormatter: discountFormatter,
      },
      {
        headerName: 'Active',
        field: 'isActive',
        width: 100,
        cellRenderer: activeCellRenderer,
      },
      {
        headerName: 'Subtotal',
        field: 'subtotal',
        width: 140,
        cellRenderer: CalculationRenderer,
        valueGetter: subtotalGetter,
        valueFormatter: currencyFormatter,
        type: 'numericColumn',
      },
      {
        headerName: 'Total',
        field: 'total',
        width: 140,
        cellRenderer: CalculationRenderer,
        valueGetter: totalGetter,
        valueFormatter: currencyFormatter,
        type: 'numericColumn',
      },
      {
        headerName: 'Status',
        field: 'status',
        width: 180,
        cellRenderer: ChipsRenderer,
        valueGetter: statusGetter,
      },
    ],
    [
      quantityParams,
      unitPriceParams,
      discountParams,
      unitPriceFormatter,
      discountFormatter,
      currencyFormatter,
      subtotalGetter,
      totalGetter,
      statusGetter,
      activeCellRenderer,
    ]
  );

  const defaultColDef = useMemo<ColDef>(
    () => ({
      sortable: true,
      filter: true,
      resizable: true,
      flex: 1,
      minWidth: 100,
    }),
    []
  );

  // getRowId callback for immutable data updates (recommended by AG Grid)
  const getRowId = useCallback((params: { data: DataRow }) => {
    return params.data.id;
  }, []);

  const gridOptions = useMemo<GridOptions<DataRow>>(
    () => ({
      suppressCellFocus: false,
      enableCellChangeFlash: true,
      animateRows: true,
      rowHeight: 50,
      headerHeight: 40,
      onCellValueChanged: handleCellValueChanged,
      getRowId,
      onGridReady: (params) => {
        gridApiRef.current = params.api;
      },
    }),
    [handleCellValueChanged, getRowId]
  );

  return (
    <div className="data-grid-container">
      {/* Search Input */}
      <div className="search-section">
        <label htmlFor="search-input" className="search-label">
          Search:
        </label>
        <input
          id="search-input"
          type="text"
          className="search-input"
          placeholder="Search by product name or category..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="search-clear-button"
          >
            Clear
          </button>
        )}
        {searchTerm && (
          <span className="search-results-count">
            {filteredData.length} result{filteredData.length !== 1 ? 's' : ''} found
          </span>
        )}
      </div>

      {/* Total Filter */}
      <div className="total-filter-section">
        <label htmlFor="total-filter" className="total-filter-label">
          Total:
        </label>
        <select
          id="total-operator"
          className="total-filter-select"
          value={totalFilterOperator}
          onChange={(e) => setTotalFilterOperator(e.target.value as 'greater' | 'less')}
        >
          <option value="greater">Greater than (&gt;)</option>
          <option value="less">Less than (&lt;)</option>
        </select>
        <input
          id="total-filter"
          type="number"
          className="total-filter-input"
          placeholder="Enter amount..."
          value={totalFilterValue}
          onChange={(e) => setTotalFilterValue(e.target.value)}
        />
        {totalFilterValue && (
          <button
            onClick={() => {
              setTotalFilterValue('');
              setTotalFilterOperator('greater');
            }}
            className="total-filter-clear-button"
          >
            Clear
          </button>
        )}
        {(searchTerm || totalFilterValue) && (
          <span className="filter-results-count">
            Showing {filteredData.length} of {data.length} row{data.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>
      
      <div className="ag-theme-alpine data-grid-wrapper">
        <AgGridReact<DataRow>
          rowData={filteredData}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          gridOptions={gridOptions}
          rowBuffer={10}
          suppressRowClickSelection={true}
          enableRangeSelection={true}
          animateRows={true}
          pagination={false}
          suppressHorizontalScroll={false}
        />
      </div>
    </div>
  );
};

