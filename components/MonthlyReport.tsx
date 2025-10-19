import React from 'react';

interface MonthlyReportProps {
  reportIncome: number;
  reportExpenses: number;
  reportBalance: number;
  selectedMonth: string;
  onMonthChange: (month: string) => void;
  reportView: 'month' | 'today';
  onReportViewChange: (view: 'month' | 'today') => void;
}

const MonthlyReport: React.FC<MonthlyReportProps> = React.memo(({ 
    reportIncome,
    reportExpenses,
    reportBalance,
    selectedMonth, 
    onMonthChange, 
    reportView, 
    onReportViewChange 
}) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  return (
    <div className="space-y-6">
       <div className="flex flex-col sm:flex-row justify-between items-center border-b pb-2 gap-4">
            <h2 className="text-xl font-bold">{reportView === 'month' ? 'التقرير الشهري' : 'تقرير اليوم'}</h2>

            <div className="flex items-center gap-2">
                <div className="flex rounded-md shadow-sm" role="group">
                    <button
                        type="button"
                        onClick={() => onReportViewChange('month')}
                        className={`py-1 px-3 text-sm font-medium ${reportView === 'month' ? 'bg-rose-500 text-white' : 'bg-white text-gray-900'} rounded-r-md border border-gray-200 hover:bg-gray-100 focus:z-10 focus:ring-2 focus:ring-rose-500 transition-colors`}
                    >
                        شهري
                    </button>
                    <button
                        type="button"
                        onClick={() => onReportViewChange('today')}
                        className={`py-1 px-3 text-sm font-medium ${reportView === 'today' ? 'bg-rose-500 text-white' : 'bg-white text-gray-900'} rounded-l-md border-t border-b border-l border-gray-200 hover:bg-gray-100 focus:z-10 focus:ring-2 focus:ring-rose-500 transition-colors`}
                    >
                        اليوم
                    </button>
                </div>
                 {reportView === 'month' && (
                    <input 
                        type="month"
                        id="month-picker"
                        value={selectedMonth}
                        onChange={(e) => onMonthChange(e.target.value)}
                        className="border border-gray-300 rounded-md p-1 focus:ring-rose-500 focus:border-rose-500"
                        aria-label="اختر الشهر"
                    />
                )}
            </div>
       </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div className="p-4 bg-green-100 text-green-800 rounded-xl">
                <h3 className="font-semibold">{reportView === 'month' ? 'إيرادات الشهر' : 'إيرادات اليوم'}</h3>
                <p className="text-2xl font-bold">{formatCurrency(reportIncome)}</p>
            </div>
             <div className="p-4 bg-red-100 text-red-800 rounded-xl">
                <h3 className="font-semibold">{reportView === 'month' ? 'مصروفات الشهر' : 'مصروفات اليوم'}</h3>
                <p className="text-2xl font-bold">{formatCurrency(reportExpenses)}</p>
            </div>
            <div className={`p-4 rounded-xl ${reportBalance >= 0 ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'}`}>
                <h3 className="font-semibold">{reportView === 'month' ? 'رصيد الشهر' : 'رصيد اليوم'}</h3>
                <p className="text-2xl font-bold">{formatCurrency(reportBalance)}</p>
            </div>
        </div>
    </div>
  );
});

export default MonthlyReport;