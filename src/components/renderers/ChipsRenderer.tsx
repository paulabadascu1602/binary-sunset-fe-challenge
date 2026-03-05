import React from 'react';
import { ICellRendererParams } from 'ag-grid-community';

interface ChipsRendererParams extends ICellRendererParams {
  value: string;
  data: {
    status?: string;
    [key: string]: unknown;
  };
}

const STATUS_ICONS: Record<string, string> = {
  'High Priority': '🔥',
  'Pending': '⏳',
  'Completed': '✨',
  'Warning': '⚠️',
  'Normal': 'ℹ️',
};

const getStatusClassName = (status: string): string => {
  const statusKey = status.toLowerCase().replace(/\s+/g, '-');
  return `status-chip-${statusKey}`;
};

export const ChipsRenderer: React.FC<ChipsRendererParams> = ({ value, data }) => {
  const status = value || data.status || 'Normal';
  const icon = STATUS_ICONS[status] || STATUS_ICONS['Normal'];
  const statusClassName = getStatusClassName(status);

  return (
    <span className={`status-chip ${statusClassName}`}>
      <span className="status-chip-icon">
        {icon}
      </span>
      <span className="status-chip-text">{status}</span>
    </span>
  );
};

