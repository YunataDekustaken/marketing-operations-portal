import { MarketingRequest } from '../types';

export const exportToCSV = (requests: MarketingRequest[], filename: string) => {
  const headers = [
    'Request ID',
    'Title',
    'Department',
    'Brand',
    'Request Type',
    'Priority',
    'Status',
    'Requested By',
    'Assigned To',
    'Date Requested',
    'Date Needed',
    'Completed At',
    'Revision Count'
  ];

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch (e) {
      return '';
    }
  };

  const escapeCSV = (str: string | undefined | null) => {
    if (!str) return '';
    const stringified = String(str);
    if (stringified.includes(',') || stringified.includes('"') || stringified.includes('\n')) {
      return `"${stringified.replace(/"/g, '""')}"`;
    }
    return stringified;
  };

  const rows = requests.map(req => [
    escapeCSV(req.requestId),
    escapeCSV(req.requestTitle),
    escapeCSV(req.department),
    escapeCSV(req.brand),
    escapeCSV(req.requestType),
    escapeCSV(req.priority),
    escapeCSV(req.status),
    escapeCSV(req.requestorName),
    escapeCSV(req.assignedToName),
    escapeCSV(formatDate(req.dateRequested)),
    escapeCSV(req.dateNeeded),
    escapeCSV(formatDate(req.completedAt)),
    escapeCSV(String(req.revisionCount || 0))
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
