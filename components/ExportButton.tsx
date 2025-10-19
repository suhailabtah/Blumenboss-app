import React from 'react';
import { Transaction } from '../types';
import { ExportIcon } from './Icons';

interface ExportButtonProps {
  transactions: Transaction[];
}

const escapeCSV = (field: any): string => {
  const str = String(field);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

const ExportButton: React.FC<ExportButtonProps> = ({ transactions }) => {
  const handleExport = () => {
    if (transactions.length === 0) {
      alert('لا توجد بيانات لتصديرها.');
      return;
    }

    const headers = ['الوصف', 'المبلغ', 'النوع', 'التاريخ'];
    
    const csvRows = transactions.map(t => {
      const row = [
        escapeCSV(t.description),
        t.amount.toString(),
        t.type === 'INCOME' ? 'إيراد' : 'مصروف', // Translate type
        escapeCSV(new Date(t.date).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' })),
      ];
      return row.join(',');
    });

    const csvString = [headers.join(','), ...csvRows].join('\n');
    const blob = new Blob([`\uFEFF${csvString}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `blumenboss-transactions-${new Date().toISOString().slice(0,10)}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={transactions.length === 0}
      className="flex items-center gap-2 bg-slate-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 transition-colors duration-300 disabled:bg-slate-300 disabled:cursor-not-allowed"
      aria-label="تصدير البيانات كملف CSV"
    >
      <ExportIcon className="w-5 h-5" />
      <span>تصدير CSV</span>
    </button>
  );
};

export default ExportButton;