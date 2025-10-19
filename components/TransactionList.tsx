import React, { useState, useMemo } from 'react';
import { Transaction, TransactionType } from '../types';
import { TrashIcon } from './Icons';
import ConfirmationModal from './ConfirmationModal';
import { useUserMode } from '../contexts/UserModeContext';

interface TransactionListProps {
  transactions: Transaction[];
  onDeleteTransaction: (id: string) => void;
  totalTransactionCount: number;
}

interface TransactionListItemProps {
  transaction: Transaction;
  onRequestDelete: () => void;
}

// Helper function to get the start of the week (Monday)
const getStartOfWeek = (date: Date): Date => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0); // Normalize time
  const day = d.getDay(); // Sunday = 0, Monday = 1...
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust to get Monday
  return new Date(d.setDate(diff));
};


const TransactionListItem: React.FC<TransactionListItemProps> = ({ transaction, onRequestDelete }) => {
    const { isAccountantMode } = useUserMode();
    const isIncome = transaction.type === TransactionType.INCOME;
    const borderColor = isIncome ? 'border-green-500' : 'border-red-500';
    const amountColor = isIncome ? 'text-green-600' : 'text-red-600';
    const sign = isIncome ? '+' : '-';

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('de-DE', {
            style: 'currency',
            currency: 'EUR',
        }).format(amount);
    };

    return (
        <li className={`flex items-center justify-between p-3 bg-white hover:bg-gray-50 rounded-lg border-r-4 ${borderColor} shadow-sm transition-colors`}>
            <div className="flex flex-col">
                <span className="font-semibold text-slate-700">{transaction.description}</span>
                <span className="text-sm text-slate-500">
                    {new Date(transaction.date).toLocaleTimeString('ar-EG', { hour: 'numeric', minute: '2-digit', hour12: true })}
                </span>
            </div>
            <div className="flex items-center gap-4">
                <span className={`font-bold text-lg ${amountColor}`}>
                    {sign}{formatCurrency(transaction.amount)}
                </span>
                {!isAccountantMode && (
                    <button
                        onClick={onRequestDelete}
                        className="text-gray-400 hover:text-red-500 transition-colors duration-200"
                        aria-label="حذف العملية"
                    >
                        <TrashIcon className="w-5 h-5" />
                    </button>
                )}
            </div>
        </li>
    );
};

const TransactionList: React.FC<TransactionListProps> = ({ transactions, onDeleteTransaction, totalTransactionCount }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<string | null>(null);
  const [groupingMode, setGroupingMode] = useState<'daily' | 'weekly'>('daily');

  const handleRequestDelete = (id: string) => {
    setTransactionToDelete(id);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setTransactionToDelete(null);
  };

  const handleConfirmDelete = () => {
    if (transactionToDelete) {
      onDeleteTransaction(transactionToDelete);
    }
  };


  if (totalTransactionCount === 0) {
    return (
      <div className="text-center text-gray-500 py-10">
        <p>لا توجد عمليات مسجلة بعد.</p>
        <p className="text-sm">ابدأ بإضافة إيراد أو مصروف من النموذج أعلاه.</p>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="text-center text-gray-500 py-10">
        <p>لا توجد نتائج تطابق بحثك.</p>
        <p className="text-sm">حاول تغيير كلمات البحث أو تعديل الفلاتر.</p>
      </div>
    );
  }


  const groupedTransactions = useMemo(() => {
    return transactions.reduce((acc, transaction) => {
      const transactionDate = new Date(transaction.date);
      let key = '';

      if (groupingMode === 'daily') {
        key = transactionDate.toLocaleDateString('en-CA'); // YYYY-MM-DD
      } else { // weekly
        const startOfWeek = getStartOfWeek(transactionDate);
        key = startOfWeek.toLocaleDateString('en-CA');
      }
      
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(transaction);
      return acc;
    }, {} as Record<string, Transaction[]>);
  }, [transactions, groupingMode]);
  
  const formatDateHeader = (dateString: string) => {
    const transactionDate = new Date(dateString + 'T00:00:00'); 
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    const isSameDay = (d1: Date, d2: Date) => {
        return d1.getFullYear() === d2.getFullYear() &&
               d1.getMonth() === d2.getMonth() &&
               d1.getDate() === d2.getDate();
    }

    if (isSameDay(transactionDate, today)) return 'اليوم';
    if (isSameDay(transactionDate, yesterday)) return 'أمس';

    const formatOptions: Intl.DateTimeFormatOptions = {
        weekday: 'long', day: 'numeric', month: 'long',
    };

    if (transactionDate.getFullYear() !== today.getFullYear()) {
        formatOptions.year = 'numeric';
    }
    
    return new Intl.DateTimeFormat('ar-EG', formatOptions).format(transactionDate);
  };

  const formatWeekHeader = (dateString: string) => {
    const startDate = new Date(dateString + 'T00:00:00');
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);

    const startOfThisWeek = getStartOfWeek(new Date());
    const lastWeekDate = new Date();
    lastWeekDate.setDate(lastWeekDate.getDate() - 7);
    const startOfLastWeek = getStartOfWeek(lastWeekDate);
    
    if (startDate.getTime() === startOfThisWeek.getTime()) return 'هذا الأسبوع';
    if (startDate.getTime() === startOfLastWeek.getTime()) return 'الأسبوع الماضي';

    const formatOptions: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long' };
    if (startDate.getFullYear() !== new Date().getFullYear()) {
      formatOptions.year = 'numeric';
    }

    const startFormatted = startDate.toLocaleDateString('ar-EG', formatOptions);
    const endFormatted = endDate.toLocaleDateString('ar-EG', formatOptions);

    return `أسبوع ${startFormatted} إلى ${endFormatted}`;
  };


  return (
    <>
      <div className="flex justify-end mb-4 items-center">
        <span className="text-sm font-medium text-gray-700 ml-3">تجميع حسب:</span>
        <div className="inline-flex rounded-md shadow-sm" role="group">
          <button
            type="button"
            onClick={() => setGroupingMode('daily')}
            className={`py-1 px-3 text-sm font-medium ${groupingMode === 'daily' ? 'bg-rose-500 text-white' : 'bg-white text-gray-900'} rounded-r-md border border-gray-200 hover:bg-gray-100 focus:z-10 focus:ring-2 focus:ring-rose-500 transition-colors`}
          >
            يومي
          </button>
          <button
            type="button"
            onClick={() => setGroupingMode('weekly')}
            className={`py-1 px-3 text-sm font-medium ${groupingMode === 'weekly' ? 'bg-rose-500 text-white' : 'bg-white text-gray-900'} rounded-l-md border-t border-b border-l border-gray-200 hover:bg-gray-100 focus:z-10 focus:ring-2 focus:ring-rose-500 transition-colors`}
          >
            أسبوعي
          </button>
        </div>
      </div>
      <div className="space-y-4 max-h-[45vh] overflow-y-auto pr-2">
        {Object.keys(groupedTransactions)
          .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
          .map(date => (
            <div key={date}>
              <h3 className="font-bold text-slate-500 bg-rose-100 py-1 px-3 rounded-md mb-2 sticky top-0 z-10">
                {groupingMode === 'daily' ? formatDateHeader(date) : formatWeekHeader(date)}
              </h3>
              <ul className="space-y-2">
                {groupedTransactions[date].map((transaction) => (
                   <TransactionListItem 
                     key={transaction.id} 
                     transaction={transaction} 
                     onRequestDelete={() => handleRequestDelete(transaction.id)}
                   />
                ))}
              </ul>
            </div>
          ))}
      </div>
      <ConfirmationModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onConfirm={handleConfirmDelete}
        title="تأكيد الحذف"
        message="هل أنت متأكد من رغبتك في حذف هذه العملية؟ لا يمكن التراجع عن هذا الإجراء."
      />
    </>
  );
};

export default TransactionList;