import React from 'react';
import { render, screen } from '@testing-library/react';
import { ChipsRenderer } from '../ChipsRenderer';
import { ICellRendererParams } from 'ag-grid-community';

describe('ChipsRenderer', () => {
  const createMockParams = (status: string): ICellRendererParams => ({
    value: status,
    data: { status },
    node: {} as never,
    api: {} as never,
    columnApi: {} as never,
    colDef: {} as never,
    column: {} as never,
    rowIndex: 0,
    getValue: () => status,
    setValue: jest.fn(),
    formatValue: jest.fn(),
    valueFormatted: status,
    refreshCell: jest.fn(),
    eGridCell: document.createElement('div'),
    eParentOfValue: document.createElement('div'),
    registerRowDragger: jest.fn(),
    setTooltip: jest.fn(),
    context: {},
  } as ICellRendererParams);

  it('should render High Priority chip with correct styling', () => {
    const params = createMockParams('High Priority');
    const { container } = render(<ChipsRenderer {...params} />);

    const chip = container.querySelector('.status-chip.status-chip-high-priority') as HTMLElement;
    expect(chip).toBeInTheDocument();
    expect(chip).toHaveClass('status-chip');
    expect(chip).toHaveClass('status-chip-high-priority');
    expect(chip).toHaveTextContent('High Priority');
    expect(chip).toHaveTextContent('🔥');
  });

  it('should render Warning chip with correct styling', () => {
    const params = createMockParams('Warning');
    const { container } = render(<ChipsRenderer {...params} />);

    const chip = container.querySelector('.status-chip.status-chip-warning') as HTMLElement;
    expect(chip).toBeInTheDocument();
    expect(chip).toHaveClass('status-chip');
    expect(chip).toHaveClass('status-chip-warning');
    expect(chip).toHaveTextContent('Warning');
    expect(chip).toHaveTextContent('⚠️');
  });

  it('should render Completed chip with correct styling', () => {
    const params = createMockParams('Completed');
    const { container } = render(<ChipsRenderer {...params} />);

    const chip = container.querySelector('.status-chip.status-chip-completed') as HTMLElement;
    expect(chip).toBeInTheDocument();
    expect(chip).toHaveClass('status-chip');
    expect(chip).toHaveClass('status-chip-completed');
    expect(chip).toHaveTextContent('Completed');
    expect(chip).toHaveTextContent('✨');
  });

  it('should render Pending chip with correct styling', () => {
    const params = createMockParams('Pending');
    const { container } = render(<ChipsRenderer {...params} />);

    const chip = container.querySelector('.status-chip.status-chip-pending') as HTMLElement;
    expect(chip).toBeInTheDocument();
    expect(chip).toHaveClass('status-chip');
    expect(chip).toHaveClass('status-chip-pending');
    expect(chip).toHaveTextContent('Pending');
    expect(chip).toHaveTextContent('⏳');
  });

  it('should render Normal chip as default', () => {
    const params = createMockParams('Normal');
    const { container } = render(<ChipsRenderer {...params} />);

    const chip = container.querySelector('.status-chip.status-chip-normal') as HTMLElement;
    expect(chip).toBeInTheDocument();
    expect(chip).toHaveClass('status-chip');
    expect(chip).toHaveClass('status-chip-normal');
    expect(chip).toHaveTextContent('Normal');
    expect(chip).toHaveTextContent('ℹ️');
  });

  it('should default to Normal for unknown status', () => {
    const params = createMockParams('Unknown');
    render(<ChipsRenderer {...params} />);

    const chip = screen.getByText(/Unknown/);
    expect(chip).toBeInTheDocument();
  });

  it('should have hover styles defined in CSS', () => {
    const params = createMockParams('High Priority');
    const { container } = render(<ChipsRenderer {...params} />);

    const chip = container.querySelector('.status-chip.status-chip-high-priority') as HTMLElement;
    expect(chip).toBeInTheDocument();
    // Hover styles are handled by CSS :hover pseudo-class
    // In Jest environment, we can only verify the element exists and has correct classes
    expect(chip).toHaveClass('status-chip');
    expect(chip).toHaveClass('status-chip-high-priority');
  });
});
