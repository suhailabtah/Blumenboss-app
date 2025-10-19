
import React from 'react';

interface SummaryProps {
  income: number;
  expenses: number;
  balance: number;
}

const Summary: React.FC<SummaryProps> = React.memo(({ income, expenses, balance }) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-lg space-y-6 sticky top-8">
       <h2 className="text-xl font-bold text-center border-b pb-2">الملخص المالي</h2>
      <div className="p-4 bg-green-100 text-green-800 rounded-xl">
        <h3 className="text-lg font-semibold">إجمالي الإيرادات</h3>
        <p className="text-2xl font-bold">{formatCurrency(income)}</p>
      </div>
      <div className="p-4 bg-red-100 text-red-800 rounded-xl">
        <h3 className="text-lg font-semibold">إجمالي المصروفات</h3>
        <p className="text-2xl font-bold">{formatCurrency(expenses)}</p>
      </div>
      <div className={`p-4 rounded-xl ${balance >= 0 ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'}`}>
        <h3 className="text-lg font-semibold">الرصيد الحالي</h3>
        <p className="text-2xl font-bold">{formatCurrency(balance)}</p>
      </div>
    </div>
  );
});

export default Summary;
