import React, { useState, useEffect, useRef } from 'react';
import { ICellRendererParams, CellValueChangedEvent } from 'ag-grid-community';

interface EditableCellRendererParams extends ICellRendererParams {
  value: number | string;
  data: {
    [key: string]: unknown;
  };
  field: string;
  onCellValueChanged?: (event: CellValueChangedEvent) => void;
}

export const EditableCellRenderer: React.FC<EditableCellRendererParams> = ({
  value,
  data,
  field,
  api,
  node,
  onCellValueChanged,
}) => {
  // Keep as string during editing to allow user to clear the field
  const [editValue, setEditValue] = useState<string>(String(value || ''));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditValue(String(value || ''));
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    setEditValue(inputValue);
    
    // For number fields, parse and update data only if value is valid
    if (field === 'quantity' || field === 'unitPrice' || field === 'discount') {
      // Allow empty string during editing
      if (inputValue === '' || inputValue === '-') {
        // Don't update data yet, let user finish typing
        return;
      }
      
      const numValue = parseFloat(inputValue);
      if (!isNaN(numValue) && node && api) {
        const updatedData = { ...data, [field]: numValue };
        node.setData(updatedData);
        
        // Trigger refresh to recalculate dependent columns
        api.refreshCells({
          rowNodes: [node],
          force: true,
        });
      }
    } else {
      // For text fields, update immediately
      if (node && api) {
        const updatedData = { ...data, [field]: inputValue };
        node.setData(updatedData);
      }
    }
  };

  const handleBlur = () => {
    // Convert to number and finalize value on blur
    if (node && api) {
      let finalValue: number | string;
      
      if (field === 'quantity' || field === 'unitPrice' || field === 'discount') {
        // Convert empty string to 0, or parse the number
        finalValue = editValue === '' || editValue === '-' ? 0 : parseFloat(editValue) || 0;
      } else {
        finalValue = editValue;
      }
      
      const updatedData = { ...data, [field]: finalValue };
      node.setData(updatedData);
      
      // Update local state to reflect final value
      setEditValue(String(finalValue));
      
      // Trigger refresh to recalculate dependent columns
      api.refreshCells({
        rowNodes: [node],
        force: true,
      });
      
      // Manually trigger onCellValueChanged if available
      // This is needed because node.setData() doesn't trigger onCellValueChanged automatically
      if (onCellValueChanged && api && node) {
        const mockEvent = {
          data: updatedData,
          node: node,
          api: api,
          column: {} as any,
          colDef: {} as any,
          value: finalValue,
          newValue: finalValue,
          oldValue: value,
          rowIndex: node.rowIndex || 0,
          rowPinned: null,
          source: 'edit',
          type: 'cellValueChanged',
          columnApi: {} as any,
          context: {},
        } as CellValueChangedEvent;
        
        onCellValueChanged(mockEvent);
      }
      
      api.stopEditing();
    }
  };

  const isNumberField = field === 'quantity' || field === 'unitPrice' || field === 'discount';

  return (
    <input
      ref={inputRef}
      type={isNumberField ? 'text' : 'text'}
      inputMode={isNumberField ? 'decimal' : 'text'}
      value={editValue}
      onChange={handleChange}
      onBlur={handleBlur}
      className="editable-cell-input"
    />
  );
};

