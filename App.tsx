import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Transaction, TransactionType, PaymentMethod } from './types';
import { FlowerIcon, InfoIcon, UserShieldIcon, TrashIcon, ExportIcon, SearchIcon, FilterIcon, UsersIcon, CheckCircleIcon, CashIcon, BankIcon, PrintIcon, ImportIcon } from './components/Icons';
import ConfirmationModal from './components/ConfirmationModal';

// === TYPES ===
enum DebtStatus {
  UNPAID = 'UNPAID',
  PAID = 'PAID',
}

interface Debt {
  id: string;
  clientName: string;
  description: string;
  amount: number;
  status: DebtStatus;
  date: string; // Creation date
  notes?: string;
}


// Helper function to format currency
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
};

// Helper function to convert Arabic/Persian numerals to English numerals
const convertToEnglishNumerals = (str: string): string => {
    if (typeof str !== 'string') return str;
    const arabicPersianNumerals = /[\u0660-\u0669\u06F0-\u06F9]/g;
    const numeralMap: { [key: string]: string } = {
        '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4', '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
        '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4', '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9'
    };
    return str.replace(arabicPersianNumerals, (match) => numeralMap[match]);
};


// The entire application is now a single, unified component.
const App: React.FC = () => {
  // === STATE MANAGEMENT ===

  // Main transactions state from localStorage
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    try {
      const savedTransactions = localStorage.getItem('transactions');
      const parsed = savedTransactions ? JSON.parse(savedTransactions) : [];
      // Data migration for older records without paymentMethod
      return parsed.map((t: any) => ({
        ...t,
        paymentMethod: t.paymentMethod || PaymentMethod.CASH,
      }));
    } catch (error) {
      console.error('Error reading transactions from localStorage', error);
      return [];
    }
  });

  // Main debts state from localStorage
  const [debts, setDebts] = useState<Debt[]>(() => {
    try {
      const savedDebts = localStorage.getItem('debts');
      return savedDebts ? JSON.parse(savedDebts) : [];
    } catch (error) {
      console.error('Error reading debts from localStorage', error);
      return [];
    }
  });

  // State for the new transaction form
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<TransactionType>(TransactionType.INCOME);
  
  // State for the new debt form
  const [debtClientName, setDebtClientName] = useState('');
  const [debtDescription, setDebtDescription] = useState('');
  const [debtAmount, setDebtAmount] = useState('');
  const [debtNotes, setDebtNotes] = useState('');

  // State for filtering the transaction list
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | TransactionType>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [groupingMode, setGroupingMode] = useState<'daily' | 'weekly'>('daily');

  // State for the report section
  const [reportView, setReportView] = useState<'month' | 'today'>('month');
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [reportStartDate, setReportStartDate] = useState('');
  const [reportEndDate, setReportEndDate] = useState('');
  
  // State for the main view
  const [activeView, setActiveView] = useState<'transactions' | 'debts' | 'reports'>('transactions');
  const [activeAccountView, setActiveAccountView] = useState<PaymentMethod>(PaymentMethod.CASH);

  // State for modals
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<string | null>(null);
  const [isDebtModalOpen, setIsDebtModalOpen] = useState(false);
  const [debtToDelete, setDebtToDelete] = useState<string | null>(null);
  const [debtToSettle, setDebtToSettle] = useState<Debt | null>(null);
  
  // === DERIVED STATE & MEMOIZED CALCULATIONS ===

  const isAccountantMode = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('mode') === 'accountant';
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('transactions', JSON.stringify(transactions));
    } catch (error) {
      console.error('Error writing transactions to localStorage', error);
    }
  }, [transactions]);
  
  useEffect(() => {
    try {
      localStorage.setItem('debts', JSON.stringify(debts));
    } catch (error) {
      console.error('Error writing debts to localStorage', error);
    }
  }, [debts]);
  
  const { cashBalance, bankBalance, totalBalance } = useMemo(() => {
    let cashInc = 0, cashExp = 0, bankInc = 0, bankExp = 0;
    transactions.forEach(t => {
        if (t.paymentMethod === PaymentMethod.CASH) {
            if (t.type === TransactionType.INCOME) cashInc += t.amount; else cashExp += t.amount;
        } else { // BANK
            if (t.type === TransactionType.INCOME) bankInc += t.amount; else bankExp += t.amount;
        }
    });
    return {
        cashBalance: cashInc - cashExp,
        bankBalance: bankInc - bankExp,
        totalBalance: (cashInc + bankInc) - (cashExp + bankExp),
    };
  }, [transactions]);

  const totalUnpaidDebts = useMemo(() => {
      return debts
          .filter(d => d.status === DebtStatus.UNPAID)
          .reduce((sum, d) => sum + d.amount, 0);
  }, [debts]);
  
  const filteredTransactions = useMemo(() => {
    return transactions
        .filter(t => activeView === 'transactions' ? t.paymentMethod === activeAccountView : true)
        .filter(t => {
            const englishSearchTerm = convertToEnglishNumerals(searchTerm);
            if (englishSearchTerm && !convertToEnglishNumerals(t.description).toLowerCase().includes(englishSearchTerm.toLowerCase())) return false;
            if (filterType !== 'all' && t.type !== filterType) return false;
            const transactionDate = t.date.slice(0, 10);
            if (startDate && transactionDate < startDate) return false;
            if (endDate && transactionDate > endDate) return false;
            return true;
        });
  }, [transactions, searchTerm, filterType, startDate, endDate, activeView, activeAccountView]);

  const { unpaidDebts, paidDebts } = useMemo(() => {
    const unpaid = debts.filter(d => d.status === DebtStatus.UNPAID).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const paid = debts.filter(d => d.status === DebtStatus.PAID).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return { unpaidDebts: unpaid, paidDebts: paid };
  }, [debts]);
  
  const reportData = useMemo(() => {
    const sourceData = reportView === 'today'
      ? transactions.filter(t => t.date.startsWith(new Date().toISOString().slice(0, 10)))
      : transactions.filter(t => t.date.startsWith(selectedMonth));
      
    const income = sourceData.filter(t => t.type === TransactionType.INCOME).reduce((sum, t) => sum + t.amount, 0);
    const expenses = sourceData.filter(t => t.type === TransactionType.EXPENSE).reduce((sum, t) => sum + t.amount, 0);
    
    return { income, expenses, balance: income - expenses };
  }, [transactions, selectedMonth, reportView]);

  const groupedTransactions = useMemo(() => {
    const getStartOfWeek = (date: Date): Date => {
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        return new Date(d.setDate(diff));
    };
    return filteredTransactions.reduce((acc, transaction) => {
      const transactionDate = new Date(transaction.date);
      const key = groupingMode === 'daily' 
        ? transactionDate.toLocaleDateString('en-CA') 
        : getStartOfWeek(transactionDate).toLocaleDateString('en-CA');
      
      if (!acc[key]) acc[key] = [];
      acc[key].push(transaction);
      return acc;
    }, {} as Record<string, Transaction[]>);
  }, [filteredTransactions, groupingMode]);
  
  const { incomeTransactions, expenseTransactions, bankTransactions } = useMemo(() => {
    const filterByDate = (t: Transaction) => {
        if (!reportStartDate && !reportEndDate) return true;
        const transactionDate = t.date.slice(0, 10);
        if (reportStartDate && transactionDate < reportStartDate) return false;
        if (reportEndDate && transactionDate > reportEndDate) return false;
        return true;
    };

    const income = transactions
      .filter(t => t.type === TransactionType.INCOME && filterByDate(t))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const expense = transactions
      .filter(t => t.type === TransactionType.EXPENSE && filterByDate(t))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const bank = transactions
      .filter(t => t.paymentMethod === PaymentMethod.BANK && filterByDate(t))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
    return { incomeTransactions: income, expenseTransactions: expense, bankTransactions: bank };
  }, [transactions, reportStartDate, reportEndDate]);


  // === EVENT HANDLERS ===
  
  const handleToggleMode = useCallback(() => {
    const currentUrl = new URL(window.location.href);
    if (isAccountantMode) {
        currentUrl.searchParams.delete('mode');
    } else {
        currentUrl.searchParams.set('mode', 'accountant');
    }
    window.location.href = currentUrl.toString();
  }, [isAccountantMode]);

  const handleTransactionSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = parseFloat(amount);
    if (!description.trim() || isNaN(numericAmount) || numericAmount <= 0) {
        alert('الرجاء إدخال وصف ومبلغ صحيح.');
        return;
    }
    const newTransaction: Transaction = {
      description: description.trim(),
      amount: numericAmount,
      type,
      id: new Date().getTime().toString(),
      date: new Date().toISOString(),
      paymentMethod: activeAccountView,
    };
    setTransactions(prev => [newTransaction, ...prev]);
    setDescription('');
    setAmount('');
    setType(TransactionType.INCOME);
  }, [description, amount, type, activeAccountView]);

  const handleDebtSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = parseFloat(debtAmount);
    if (!debtClientName.trim() || !debtDescription.trim() || isNaN(numericAmount) || numericAmount <= 0) {
        alert('الرجاء إدخال اسم العميل، الوصف، ومبلغ صحيح.');
        return;
    }
    const newDebt: Debt = {
        id: `debt-${new Date().getTime()}`,
        clientName: debtClientName.trim(),
        description: debtDescription.trim(),
        amount: numericAmount,
        status: DebtStatus.UNPAID,
        date: new Date().toISOString(),
        notes: debtNotes.trim() ? debtNotes.trim() : undefined,
    };
    setDebts(prev => [newDebt, ...prev]);
    setDebtClientName('');
    setDebtDescription('');
    setDebtAmount('');
    setDebtNotes('');
  }, [debtClientName, debtDescription, debtAmount, debtNotes]);

  const handleSettleDebtRequest = useCallback((debtId: string) => {
    if (isAccountantMode) {
      alert("ليس لديك صلاحية تعديل الديون في وضع المحاسب.");
      return;
    }
    const debt = debts.find(d => d.id === debtId);
    if (debt) setDebtToSettle(debt);
  }, [debts, isAccountantMode]);

  const handleConfirmSettleDebt = useCallback((settleMethod: PaymentMethod) => {
    if (!debtToSettle) return;
    const newTransaction: Transaction = {
        id: new Date().getTime().toString(),
        description: `تسديد دين: ${debtToSettle.clientName} - ${debtToSettle.description}`,
        amount: debtToSettle.amount,
        type: TransactionType.INCOME,
        date: new Date().toISOString(),
        paymentMethod: settleMethod,
    };
    setTransactions(prev => [newTransaction, ...prev]);
    setDebts(prev => prev.map(d => d.id === debtToSettle.id ? { ...d, status: DebtStatus.PAID } : d));
    setDebtToSettle(null);
  }, [debtToSettle]);

  const handleDeleteTransactionRequest = useCallback((id: string) => {
    if (isAccountantMode) {
      alert("ليس لديك صلاحية الحذف في وضع المحاسب.");
      return;
    }
    setTransactionToDelete(id);
    setIsTransactionModalOpen(true);
  }, [isAccountantMode]);

  const handleConfirmTransactionDelete = useCallback(() => {
    if (transactionToDelete) {
      setTransactions(prev => prev.filter(t => t.id !== transactionToDelete));
    }
    setIsTransactionModalOpen(false);
    setTransactionToDelete(null);
  }, [transactionToDelete]);
  
  const handleDeleteDebtRequest = useCallback((id: string) => {
    if (isAccountantMode) {
      alert("ليس لديك صلاحية الحذف في وضع المحاسب.");
      return;
    }
    setDebtToDelete(id);
    setIsDebtModalOpen(true);
  }, [isAccountantMode]);
  
  const handleConfirmDebtDelete = useCallback(() => {
    if (debtToDelete) {
        setDebts(prev => prev.filter(d => d.id !== debtToDelete));
    }
    setIsDebtModalOpen(false);
    setDebtToDelete(null);
  }, [debtToDelete]);
  
  const handleClearFilters = useCallback(() => {
    setSearchTerm('');
    setFilterType('all');
    setStartDate('');
    setEndDate('');
  }, []);

  const handleExport = useCallback(() => {
    if (transactions.length === 0) {
      alert('لا توجد بيانات لتصديرها.');
      return;
    }
    const escapeCSV = (field: any): string => {
        const str = String(field);
        if (/[",\n\r]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
        return str;
    };
    // Note: The header order MUST match the import logic.
    const headers = ['id', 'description', 'amount', 'type', 'paymentMethod', 'date'];
    const csvRows = transactions.map(t => [
        escapeCSV(t.id),
        escapeCSV(t.description),
        t.amount.toString(),
        escapeCSV(t.type),
        escapeCSV(t.paymentMethod),
        escapeCSV(t.date),
    ].join(','));

    const csvString = [headers.join(','), ...csvRows].join('\n');
    const blob = new Blob([`\uFEFF${csvString}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `blumenboss-transactions-${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [transactions]);

  const handleImport = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) return;
      
      try {
        const rows = text.split('\n').filter(row => row.trim() !== '');
        const headerRow = rows.shift();
        if (!headerRow) throw new Error('ملف CSV فارغ أو غير صالح.');

        // Simple header validation
        const headers = headerRow.split(',').map(h => h.trim());
        if (headers.length < 6 || headers[1] !== 'description' || headers[2] !== 'amount') {
          throw new Error('صيغة ملف CSV غير صحيحة. يرجى استخدام ملف تم تصديره من هذا التطبيق.');
        }

        const importedTransactions: Transaction[] = rows.map((row, index) => {
          // A more robust CSV parser would handle commas within quoted fields
          const values = row.split(','); 
          
          const amount = parseFloat(values[2]);
          if (isNaN(amount)) {
            console.warn(`Skipping row ${index + 1} due to invalid amount:`, row);
            return null;
          }

          const transaction: Transaction = {
            id: values[0],
            description: values[1].replace(/"/g, ''), // Basic unescaping
            amount: amount,
            type: values[3] as TransactionType,
            paymentMethod: values[4] as PaymentMethod,
            date: values[5],
          };
          
          // Basic validation
          if (!transaction.id || !transaction.date || !Object.values(TransactionType).includes(transaction.type)) {
             console.warn(`Skipping row ${index + 1} due to invalid data:`, row);
            return null;
          }
          return transaction;
        }).filter((t): t is Transaction => t !== null);

        // Merge imported transactions with existing ones, avoiding duplicates
        setTransactions(prev => {
          const existingIds = new Set(prev.map(t => t.id));
          const newTransactions = importedTransactions.filter(t => !existingIds.has(t.id));
          return [...newTransactions, ...prev];
        });

        alert(`تم استيراد ${importedTransactions.length} عملية بنجاح!`);
      } catch (error: any) {
        console.error('Error parsing CSV file:', error);
        alert(`حدث خطأ أثناء استيراد الملف: ${error.message}`);
      } finally {
        // Reset file input to allow importing the same file again
        event.target.value = '';
      }
    };
    reader.readAsText(file);
  }, []);


  const handlePrint = useCallback((sectionId: string) => {
    const printContents = document.getElementById(sectionId)?.innerHTML;
    if (!printContents) return;

    const originalContents = document.body.innerHTML;
    
    document.body.innerHTML = printContents;
    window.print();
    document.body.innerHTML = originalContents;
    // We need to re-attach the React app to the root
    // This is a simplified approach; a more robust solution might use iframes.
    window.location.reload(); 
  }, []);

  // === RENDER LOGIC ===

  const formatDateHeader = (dateString: string) => {
    const transactionDate = new Date(dateString + 'T00:00:00');
    const today = new Date(); today.setHours(0,0,0,0);
    const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
    
    if (transactionDate.getTime() === today.getTime()) return 'اليوم';
    if (transactionDate.getTime() === yesterday.getTime()) return 'أمس';

    const formatOptions: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long', numberingSystem: 'latn' };
    if (transactionDate.getFullYear() !== today.getFullYear()) formatOptions.year = 'numeric';
    return new Intl.DateTimeFormat('ar-EG', formatOptions).format(transactionDate);
  };

  const formatWeekHeader = (dateString: string) => {
    const startDate = new Date(dateString + 'T00:00:00');
    const getStartOfWeek = (date: Date): Date => {
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        return new Date(d.setDate(diff));
    };
    const startOfThisWeek = getStartOfWeek(new Date());
    if (startDate.getTime() === startOfThisWeek.getTime()) return 'هذا الأسبوع';
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);
    const formatOptions: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', numberingSystem: 'latn' };
    if (startDate.getFullYear() !== new Date().getFullYear()) formatOptions.year = 'numeric';
    return `أسبوع ${startDate.toLocaleDateString('ar-EG', formatOptions)} إلى ${endDate.toLocaleDateString('ar-EG', formatOptions)}`;
  };
  
  return (
    <div className="min-h-screen container mx-auto p-4 md:p-8">
      {isAccountantMode && (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-6 rounded-lg flex items-center gap-3" role="alert">
          <InfoIcon className="w-6 h-6" />
          <div>
            <p className="font-bold">وضع المحاسب</p>
            <p>في هذا الوضع، يمكنك عرض البيانات وإضافة عمليات جديدة ولكن لا يمكنك حذفها أو تعديلها.</p>
          </div>
        </div>
      )}
      <header className="text-center mb-8 relative">
        <div className="absolute top-0 left-0 rtl:left-auto rtl:right-0">
          <button
            onClick={handleToggleMode}
            className={`flex items-center gap-2 text-white font-bold py-2 px-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-300 text-sm ${isAccountantMode ? 'bg-blue-500 hover:bg-blue-600 focus:ring-blue-500' : 'bg-yellow-500 hover:bg-yellow-600 focus:ring-yellow-500'}`}
          >
            <UserShieldIcon className="w-5 h-5" />
            <span className="hidden sm:inline">{isAccountantMode ? 'وضع إداري' : 'وضع محاسب'}</span>
          </button>
        </div>
        <div className="flex items-center justify-center gap-4 text-rose-500 pt-12 sm:pt-0">
          <FlowerIcon className="w-10 h-10" />
          <h1 className="text-3xl md:text-4xl font-bold text-slate-700">دفتر حسابات Blumenboss</h1>
          <FlowerIcon className="w-10 h-10" />
        </div>
      </header>
      
      <main className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
            {/* --- Main View Tabs --- */}
            <div className="flex border-b border-gray-200">
                <button onClick={() => setActiveView('transactions')} className={`py-2 px-6 font-semibold text-lg transition-colors duration-300 ${activeView === 'transactions' ? 'border-b-2 border-rose-500 text-rose-600' : 'text-gray-500 hover:text-rose-500'}`}>
                    الحسابات
                </button>
                <button onClick={() => setActiveView('debts')} className={`py-2 px-6 font-semibold text-lg transition-colors duration-300 ${activeView === 'debts' ? 'border-b-2 border-rose-500 text-rose-600' : 'text-gray-500 hover:text-rose-500'}`}>
                    الديون
                </button>
                <button onClick={() => setActiveView('reports')} className={`py-2 px-6 font-semibold text-lg transition-colors duration-300 ${activeView === 'reports' ? 'border-b-2 border-rose-500 text-rose-600' : 'text-gray-500 hover:text-rose-500'}`}>
                    تقارير للطباعة
                </button>
            </div>

            {/* --- Conditional View Rendering --- */}
            {activeView === 'transactions' && (
                <>
                    {/* --- Sub-View Tabs for Accounts --- */}
                    <div className="flex justify-center bg-rose-100 rounded-lg p-1">
                        <button onClick={() => setActiveAccountView(PaymentMethod.CASH)} className={`w-1/2 flex justify-center items-center gap-2 py-2 px-4 font-semibold rounded-md transition-colors duration-300 ${activeAccountView === PaymentMethod.CASH ? 'bg-white text-rose-600 shadow' : 'text-gray-600 hover:bg-rose-200'}`}>
                            <CashIcon className="w-5 h-5"/> نقدي
                        </button>
                        <button onClick={() => setActiveAccountView(PaymentMethod.BANK)} className={`w-1/2 flex justify-center items-center gap-2 py-2 px-4 font-semibold rounded-md transition-colors duration-300 ${activeAccountView === PaymentMethod.BANK ? 'bg-white text-rose-600 shadow' : 'text-gray-600 hover:bg-rose-200'}`}>
                            <BankIcon className="w-5 h-5"/> تحويل بنكي
                        </button>
                    </div>
                    <div className="space-y-8">
                        {/* --- Transaction Form Section --- */}
                        {!isAccountantMode && (
                          <div className="bg-white p-6 rounded-2xl shadow-lg">
                              <h2 className="text-xl font-bold mb-4 border-b pb-2">إضافة عملية جديدة ({activeAccountView === PaymentMethod.CASH ? 'نقدية' : 'بنكية'})</h2>
                              <form onSubmit={handleTransactionSubmit} className="space-y-4">
                              <div><label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">الوصف</label><input type="text" id="description" value={description} onChange={(e) => setDescription(convertToEnglishNumerals(e.target.value))} placeholder="مثال: باقة ورد زفاف" className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-rose-500 focus:border-rose-500"/></div>
                              <div><label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">المبلغ (€)</label><input type="text" inputMode="decimal" id="amount" value={amount} onChange={(e) => setAmount(convertToEnglishNumerals(e.target.value))} placeholder="0.00" className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-rose-500 focus:border-rose-500"/></div>
                              <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-2">النوع:</label>
                                  <div className="flex items-center gap-4">
                                  <label className="flex items-center gap-2 cursor-pointer">
                                      <input type="radio" name="type" value={TransactionType.INCOME} checked={type === TransactionType.INCOME} onChange={() => setType(TransactionType.INCOME)} className="form-radio h-4 w-4 text-green-600 focus:ring-green-500"/>
                                      <span>إيراد</span>
                                  </label>
                                  <label className="flex items-center gap-2 cursor-pointer">
                                      <input type="radio" name="type" value={TransactionType.EXPENSE} checked={type === TransactionType.EXPENSE} onChange={() => setType(TransactionType.EXPENSE)} className="form-radio h-4 w-4 text-red-600 focus:ring-red-500"/>
                                      <span>مصروف</span>
                                  </label>
                                  </div>
                              </div>
                              <button type="submit" className="w-full bg-rose-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-rose-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-500 transition-colors duration-300">إضافة العملية</button>
                              </form>
                          </div>
                        )}

                        {/* --- Transaction List Section --- */}
                        <div className="bg-white p-6 rounded-2xl shadow-lg">
                            <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
                                <h2 className="text-xl font-bold">سجل العمليات</h2>
                                <div className="flex items-center gap-2">
                                    <label htmlFor="csv-import" className="flex items-center gap-2 bg-green-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors duration-300 cursor-pointer">
                                        <ImportIcon className="w-5 h-5" />
                                        <span>استيراد CSV</span>
                                        <input type="file" id="csv-import" accept=".csv" onChange={handleImport} className="hidden" />
                                    </label>
                                    <button onClick={handleExport} disabled={transactions.length === 0} className="flex items-center gap-2 bg-slate-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 transition-colors duration-300 disabled:bg-slate-300 disabled:cursor-not-allowed">
                                        <ExportIcon className="w-5 h-5" />
                                        <span>تصدير CSV</span>
                                    </button>
                                </div>
                            </div>
                            <div className="mb-6 pb-6 border-b border-gray-200"><div className="flex flex-col md:flex-row gap-4 items-start md:items-end"><div className="w-full md:flex-1"><label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">بحث بالوصف</label><div className="relative"><span className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none"><SearchIcon className="w-5 h-5 text-gray-400" /></span><input type="search" id="search" placeholder="بحث..." value={searchTerm} onChange={(e) => setSearchTerm(convertToEnglishNumerals(e.target.value))} className="w-full pr-10 pl-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-rose-500 focus:border-rose-500"/></div></div><div className="w-full md:w-48"><label htmlFor="type-filter" className="block text-sm font-medium text-gray-700 mb-1">فلترة بالنوع</label><div className="relative"><span className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none"><FilterIcon className="w-5 h-5 text-gray-400" /></span><select id="type-filter" value={filterType} onChange={(e) => setFilterType(e.target.value as 'all' | TransactionType)} className="w-full appearance-none pr-10 pl-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-rose-500 focus:border-rose-500 bg-white"><option value="all">الكل</option><option value={TransactionType.INCOME}>إيراد</option><option value={TransactionType.EXPENSE}>مصروف</option></select></div></div><div className="w-full md:flex-1"><label htmlFor="start-date" className="block text-sm font-medium text-gray-700 mb-1">نطاق التاريخ</label><div className="flex items-center border border-gray-300 rounded-md shadow-sm bg-white focus-within:ring-1 focus-within:ring-rose-500 focus-within:border-rose-500"><input type="date" id="start-date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full p-2 border-none bg-transparent focus:ring-0"/><span className="text-gray-400 rtl:border-r ltr:border-l border-gray-300 px-2">إلى</span><input type="date" id="end-date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full p-2 border-none bg-transparent focus:ring-0"/></div></div><div className="w-full md:w-auto"><button onClick={handleClearFilters} className="w-full md:w-auto bg-slate-200 text-slate-700 font-bold py-2 px-4 rounded-lg hover:bg-slate-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-400 transition-colors duration-300 whitespace-nowrap">مسح الفلاتر</button></div></div></div>
                            {transactions.length === 0 ? (<div className="text-center text-gray-500 py-10"><p>لا توجد عمليات مسجلة بعد.</p><p className="text-sm">ابدأ بإضافة إيراد أو مصروف من النموذج أعلاه.</p></div>) : filteredTransactions.length === 0 ? (<div className="text-center text-gray-500 py-10"><p>لا توجد نتائج تطابق بحثك.</p><p className="text-sm">حاول تغيير كلمات البحث أو تعديل الفلاتر.</p></div>) : (<><div className="flex justify-end mb-4 items-center"><span className="text-sm font-medium text-gray-700 ml-3">تجميع حسب:</span><div className="inline-flex rounded-md shadow-sm" role="group"><button type="button" onClick={() => setGroupingMode('daily')} className={`py-1 px-3 text-sm font-medium ${groupingMode === 'daily' ? 'bg-rose-500 text-white' : 'bg-white text-gray-900'} rounded-r-md border border-gray-200 hover:bg-gray-100 focus:z-10 focus:ring-2 focus:ring-rose-500 transition-colors`}>يومي</button><button type="button" onClick={() => setGroupingMode('weekly')} className={`py-1 px-3 text-sm font-medium ${groupingMode === 'weekly' ? 'bg-rose-500 text-white' : 'bg-white text-gray-900'} rounded-l-md border-t border-b border-l border-gray-200 hover:bg-gray-100 focus:z-10 focus:ring-2 focus:ring-rose-500 transition-colors`}>أسبوعي</button></div></div><div className="space-y-4 max-h-[45vh] overflow-y-auto pr-2">{Object.keys(groupedTransactions).sort((a, b) => new Date(b).getTime() - new Date(a).getTime()).map(date => (<div key={date}><h3 className="font-bold text-slate-500 bg-rose-100 py-1 px-3 rounded-md mb-2 sticky top-0 z-10">{groupingMode === 'daily' ? formatDateHeader(date) : formatWeekHeader(date)}</h3><ul className="space-y-2">{groupedTransactions[date].map((t) => {const isIncome = t.type === TransactionType.INCOME;return (<li key={t.id} className={`flex items-center justify-between p-3 bg-white hover:bg-gray-50 rounded-lg border-r-4 ${isIncome ? 'border-green-500' : 'border-red-500'} shadow-sm transition-colors`}><div className="flex flex-col"><span className="font-semibold text-slate-700">{t.description}</span><span className="text-sm text-slate-500">{new Date(t.date).toLocaleTimeString('ar-EG', { hour: 'numeric', minute: '2-digit', hour12: true, numberingSystem: 'latn' })}</span></div><div className="flex items-center gap-4"><span className={`font-bold text-lg ${isIncome ? 'text-green-600' : 'text-red-600'}`}>{isIncome ? '+' : '-'}{formatCurrency(t.amount)}</span>{!isAccountantMode && (<button onClick={() => handleDeleteTransactionRequest(t.id)} className="text-gray-400 hover:text-red-500 transition-colors duration-200" aria-label="حذف العملية"><TrashIcon className="w-5 h-5" /></button>)}</div></li>)})}</ul></div>))}</div></>)}
                        </div>
                        
                        {/* --- Monthly Report Section --- */}
                        <div className="bg-white p-6 rounded-2xl shadow-lg"><div className="flex flex-col sm:flex-row justify-between items-center border-b pb-2 gap-4"><h2 className="text-xl font-bold">{reportView === 'month' ? 'التقرير الشهري' : 'تقرير اليوم'}</h2><div className="flex items-center gap-2"><div className="flex rounded-md shadow-sm" role="group"><button type="button" onClick={() => setReportView('month')} className={`py-1 px-3 text-sm font-medium ${reportView === 'month' ? 'bg-rose-500 text-white' : 'bg-white text-gray-900'} rounded-r-md border border-gray-200 hover:bg-gray-100 focus:z-10 focus:ring-2 focus:ring-rose-500 transition-colors`}>شهري</button><button type="button" onClick={() => setReportView('today')} className={`py-1 px-3 text-sm font-medium ${reportView === 'today' ? 'bg-rose-500 text-white' : 'bg-white text-gray-900'} rounded-l-md border-t border-b border-l border-gray-200 hover:bg-gray-100 focus:z-10 focus:ring-2 focus:ring-rose-500 transition-colors`}>اليوم</button></div>{reportView === 'month' && (<input type="month" id="month-picker" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="border border-gray-300 rounded-md p-1 focus:ring-rose-500 focus:border-rose-500" aria-label="اختر الشهر"/>)}</div></div><div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 text-center"><div className="p-4 bg-green-100 text-green-800 rounded-xl"><h3 className="font-semibold">{reportView === 'month' ? 'إيرادات الشهر' : 'إيرادات اليوم'}</h3><p className="text-2xl font-bold">{formatCurrency(reportData.income)}</p></div><div className="p-4 bg-red-100 text-red-800 rounded-xl"><h3 className="font-semibold">{reportView === 'month' ? 'مصروفات الشهر' : 'مصروفات اليوم'}</h3><p className="text-2xl font-bold">{formatCurrency(reportData.expenses)}</p></div><div className={`p-4 rounded-xl ${reportData.balance >= 0 ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'}`}><h3 className="font-semibold">{reportView === 'month' ? 'رصيد الشهر' : 'رصيد اليوم'}</h3><p className="text-2xl font-bold">{formatCurrency(reportData.balance)}</p></div></div></div>
                    </div>
                </>
            )}

            {activeView === 'debts' && (
                <div className="space-y-8">
                    {/* --- Debt Form Section --- */}
                    {!isAccountantMode && (
                        <div className="bg-white p-6 rounded-2xl shadow-lg">
                            <h2 className="text-xl font-bold mb-4 border-b pb-2">إضافة دين جديد</h2>
                            <form onSubmit={handleDebtSubmit} className="space-y-4">
                                <div><label htmlFor="debt-client" className="block text-sm font-medium text-gray-700 mb-1">اسم العميل</label><input type="text" id="debt-client" value={debtClientName} onChange={(e) => setDebtClientName(convertToEnglishNumerals(e.target.value))} placeholder="مثال: شركة المناسبات السعيدة" className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-rose-500 focus:border-rose-500"/></div>
                                <div><label htmlFor="debt-description" className="block text-sm font-medium text-gray-700 mb-1">الوصف</label><input type="text" id="debt-description" value={debtDescription} onChange={(e) => setDebtDescription(convertToEnglishNumerals(e.target.value))} placeholder="مثال: تنسيق قاعة مؤتمرات" className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-rose-500 focus:border-rose-500"/></div>
                                <div>
                                    <label htmlFor="debt-notes" className="block text-sm font-medium text-gray-700 mb-1">ملاحظات (اختياري)</label>
                                    <textarea
                                      id="debt-notes"
                                      rows={2}
                                      value={debtNotes}
                                      onChange={(e) => setDebtNotes(convertToEnglishNumerals(e.target.value))}
                                      placeholder="مثال: تم الاتفاق على التسليم يوم الأحد"
                                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-rose-500 focus:border-rose-500"
                                    />
                                </div>
                                <div><label htmlFor="debt-amount" className="block text-sm font-medium text-gray-700 mb-1">المبلغ (€)</label><input type="text" inputMode="decimal" id="debt-amount" value={debtAmount} onChange={(e) => setDebtAmount(convertToEnglishNumerals(e.target.value))} placeholder="0.00" className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-rose-500 focus:border-rose-500"/></div>
                                <button type="submit" className="w-full bg-rose-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-rose-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-500 transition-colors duration-300">إضافة الدين</button>
                            </form>
                        </div>
                    )}

                    {/* --- Debts List Section --- */}
                    <div className="bg-white p-6 rounded-2xl shadow-lg">
                        <h2 className="text-xl font-bold mb-4">سجل الديون</h2>
                        {debts.length === 0 ? (
                             <div className="text-center text-gray-500 py-10"><p>لا توجد ديون مسجلة بعد.</p></div>
                        ) : (
                            <div className="space-y-6">
                                {/* Unpaid Debts */}
                                <div>
                                    <h3 className="font-bold text-slate-600 bg-yellow-100 py-1 px-3 rounded-md mb-3 flex items-center gap-2"><UsersIcon className="w-5 h-5" /> الديون المستحقة</h3>
                                    {unpaidDebts.length > 0 ? (
                                        <ul className="space-y-2">
                                            {unpaidDebts.map(d => (
                                                <li key={d.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-white hover:bg-gray-50 rounded-lg border-r-4 border-yellow-500 shadow-sm transition-colors">
                                                    <div className="flex-1 flex flex-col mb-2 sm:mb-0 gap-1">
                                                        <span className="font-bold text-slate-800">{d.clientName}</span>
                                                        <span className="font-semibold text-slate-700">{d.description}</span>
                                                        {d.notes && <p className="text-sm text-slate-600 bg-gray-100 p-2 rounded-md whitespace-pre-wrap">{d.notes}</p>}
                                                        <span className="text-sm text-slate-500">{new Date(d.date).toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric', numberingSystem: 'latn' })}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 self-end sm:self-center"><span className="font-bold text-lg text-yellow-700">{formatCurrency(d.amount)}</span>
                                                    {!isAccountantMode && (<>
                                                        <button onClick={() => handleSettleDebtRequest(d.id)} className="flex items-center gap-1 bg-green-500 text-white font-bold py-1 px-2 rounded-lg hover:bg-green-600 transition-colors duration-200 text-sm" aria-label="تسديد الدين"><CheckCircleIcon className="w-5 h-5" /><span>تسديد</span></button>
                                                        <button onClick={() => handleDeleteDebtRequest(d.id)} className="text-gray-400 hover:text-red-500 transition-colors duration-200" aria-label="حذف الدين"><TrashIcon className="w-5 h-5" /></button>
                                                    </>)}
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : <p className="text-sm text-gray-500 px-3">لا توجد ديون مستحقة حالياً.</p>}
                                </div>
                                {/* Paid Debts */}
                                {paidDebts.length > 0 && (
                                    <div>
                                        <h3 className="font-bold text-slate-600 bg-green-100 py-1 px-3 rounded-md mb-3 flex items-center gap-2"><UsersIcon className="w-5 h-5" /> الديون المسددة</h3>
                                        <ul className="space-y-2">
                                            {paidDebts.map(d => (
                                                <li key={d.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-white rounded-lg border-r-4 border-green-500 shadow-sm opacity-70">
                                                    <div className="flex-1 flex flex-col mb-2 sm:mb-0 gap-1">
                                                        <span className="font-bold text-slate-800 line-through">{d.clientName}</span>
                                                        <span className="font-semibold text-slate-700 line-through">{d.description}</span>
                                                         {d.notes && <p className="text-sm text-slate-500 bg-gray-100 p-2 rounded-md line-through whitespace-pre-wrap">{d.notes}</p>}
                                                        <span className="text-sm text-slate-500">{new Date(d.date).toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric', numberingSystem: 'latn' })}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 self-end sm:self-center"><span className="font-bold text-lg text-green-700 line-through">{formatCurrency(d.amount)}</span>
                                                    {!isAccountantMode && (<button onClick={() => handleDeleteDebtRequest(d.id)} className="text-gray-400 hover:text-red-500 transition-colors duration-200" aria-label="حذف الدين"><TrashIcon className="w-5 h-5" /></button>)}
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
            
            {activeView === 'reports' && (
                <div className="space-y-8">
                   <div className="bg-white p-4 rounded-2xl shadow-lg flex flex-col md:flex-row gap-4 items-center justify-center flex-wrap">
                        <label htmlFor="report-start-date" className="font-medium text-gray-700">طباعة من:</label>
                        <input type="date" id="report-start-date" value={reportStartDate} onChange={(e) => setReportStartDate(e.target.value)} className="w-full sm:w-auto p-2 border border-gray-300 rounded-md shadow-sm focus:ring-rose-500 focus:border-rose-500"/>
                        <label htmlFor="report-end-date" className="font-medium text-gray-700">إلى:</label>
                        <input type="date" id="report-end-date" value={reportEndDate} onChange={(e) => setReportEndDate(e.target.value)} className="w-full sm:w-auto p-2 border border-gray-300 rounded-md shadow-sm focus:ring-rose-500 focus:border-rose-500"/>
                        <button
                            onClick={() => { setReportStartDate(''); setReportEndDate(''); }}
                            className="w-full sm:w-auto bg-slate-200 text-slate-700 font-bold py-2 px-4 rounded-lg hover:bg-slate-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-400 transition-colors duration-300"
                        >
                            مسح التاريخ
                        </button>
                    </div>

                   <PrintableReport 
                     title="تقرير الإيرادات"
                     transactions={incomeTransactions}
                     sectionId="income-report-section"
                     onPrint={handlePrint}
                     reportStartDate={reportStartDate}
                     reportEndDate={reportEndDate}
                   />
                   <PrintableReport 
                     title="تقرير المصروفات"
                     transactions={expenseTransactions}
                     sectionId="expense-report-section"
                     onPrint={handlePrint}
                     reportStartDate={reportStartDate}
                     reportEndDate={reportEndDate}
                   />
                   <PrintableReport 
                     title="تقرير التحويلات البنكية"
                     transactions={bankTransactions}
                     sectionId="bank-report-section"
                     onPrint={handlePrint}
                     isBankReport
                     reportStartDate={reportStartDate}
                     reportEndDate={reportEndDate}
                   />
                </div>
            )}
        </div>
        
        {/* --- Summary Section --- */}
        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-2xl shadow-lg space-y-6 sticky top-8">
            <h2 className="text-xl font-bold text-center border-b pb-2">الملخص المالي</h2>
            <div className="p-4 bg-teal-100 text-teal-800 rounded-xl flex items-start gap-3"><CashIcon className="w-8 h-8 flex-shrink-0 mt-1" /><div><h3 className="text-lg font-semibold">الرصيد النقدي</h3><p className="text-2xl font-bold">{formatCurrency(cashBalance)}</p></div></div>
            <div className="p-4 bg-sky-100 text-sky-800 rounded-xl flex items-start gap-3"><BankIcon className="w-8 h-8 flex-shrink-0 mt-1" /><div><h3 className="text-lg font-semibold">رصيد البنك</h3><p className="text-2xl font-bold">{formatCurrency(bankBalance)}</p></div></div>
            <div className={`p-4 rounded-xl ${totalBalance >= 0 ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'}`}><h3 className="text-lg font-semibold">الرصيد الإجمالي</h3><p className="text-2xl font-bold">{formatCurrency(totalBalance)}</p></div>
            <div className="p-4 bg-yellow-100 text-yellow-800 rounded-xl"><h3 className="text-lg font-semibold">إجمالي الديون المستحقة</h3><p className="text-2xl font-bold">{formatCurrency(totalUnpaidDebts)}</p></div>
          </div>
        </div>
      </main>
      
      <ConfirmationModal isOpen={isTransactionModalOpen} onClose={() => setIsTransactionModalOpen(false)} onConfirm={handleConfirmTransactionDelete} title="تأكيد الحذف" message="هل أنت متأكد من رغبتك في حذف هذه العملية؟ لا يمكن التراجع عن هذا الإجراء." />
      <ConfirmationModal isOpen={isDebtModalOpen} onClose={() => setIsDebtModalOpen(false)} onConfirm={handleConfirmDebtDelete} title="تأكيد الحذف" message="هل أنت متأكد من رغبتك في حذف هذا الدين؟" />
      
      {/* Settle Debt Modal */}
      {debtToSettle && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4" onClick={() => setDebtToSettle(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center transform transition-all" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-slate-800 mb-2">تسديد دين</h3>
            <div className="text-right bg-gray-50 p-3 rounded-lg mb-6 border-r-4 border-rose-300 space-y-1">
                <p><span className="font-semibold text-slate-600">العميل:</span> {debtToSettle.clientName}</p>
                <p><span className="font-semibold text-slate-600">الوصف:</span> {debtToSettle.description}</p>
                {debtToSettle.notes && <p><span className="font-semibold text-slate-600">ملاحظات:</span> {debtToSettle.notes}</p>}
                <p className="font-bold text-lg pt-2 text-rose-600"><span className="font-semibold text-slate-600">المبلغ:</span> {formatCurrency(debtToSettle.amount)}</p>
            </div>
            <p className="text-slate-600 mb-4">كيف تم استلام المبلغ؟</p>
            <div className="flex flex-col gap-3">
              <button onClick={() => handleConfirmSettleDebt(PaymentMethod.CASH)} className="w-full flex items-center justify-center gap-2 bg-teal-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-teal-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition-colors duration-300">
                <CashIcon className="w-5 h-5" /> استلام نقدي
              </button>
              <button onClick={() => handleConfirmSettleDebt(PaymentMethod.BANK)} className="w-full flex items-center justify-center gap-2 bg-sky-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-sky-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 transition-colors duration-300">
                <BankIcon className="w-5 h-5" /> استلام كتحويل بنكي
              </button>
              <button onClick={() => setDebtToSettle(null)} className="w-full mt-2 bg-slate-200 text-slate-700 font-bold py-2 px-4 rounded-lg hover:bg-slate-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-400 transition-colors duration-300">
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


// Printable Report Component
interface PrintableReportProps {
    title: string;
    transactions: Transaction[];
    sectionId: string;
    onPrint: (sectionId: string) => void;
    isBankReport?: boolean;
    reportStartDate?: string;
    reportEndDate?: string;
}

const PrintableReport: React.FC<PrintableReportProps> = ({ title, transactions, sectionId, onPrint, isBankReport = false, reportStartDate, reportEndDate }) => {
    const total = useMemo(() => transactions.reduce((sum, t) => {
        if (isBankReport) {
            return t.type === TransactionType.INCOME ? sum + t.amount : sum - t.amount;
        }
        return sum + t.amount;
    }, 0), [transactions, isBankReport]);

    const handlePrintClick = () => {
        const formatDate = (dateString: string) => new Date(dateString + 'T00:00:00').toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' });
        
        let dateRangeText = '';
        if (reportStartDate && reportEndDate) {
            dateRangeText = `من ${formatDate(reportStartDate)} إلى ${formatDate(reportEndDate)}`;
        } else if (reportStartDate) {
            dateRangeText = `من ${formatDate(reportStartDate)}`;
        } else if (reportEndDate) {
            dateRangeText = `حتى ${formatDate(reportEndDate)}`;
        }

        const header = `
            <div style="text-align: center; margin-bottom: 20px; font-family: Cairo, sans-serif;">
                <h1 style="font-size: 24px; color: #333;">${title}</h1>
                ${dateRangeText ? `<p style="font-size: 16px; color: #555;">${dateRangeText}</p>` : ''}
                <p style="font-size: 14px; color: #777;">Blumenboss</p>
                <p style="font-size: 14px; color: #777;">تاريخ الطباعة: ${new Date().toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric'})}</p>
            </div>
        `;

        const table = document.getElementById(sectionId)?.querySelector('table')?.cloneNode(true) as HTMLTableElement;
        if (!table) return;
        
        // Add footer with total
        const tfoot = table.createTFoot();
        const footerRow = tfoot.insertRow();
        const totalCell = footerRow.insertCell();
        totalCell.colSpan = isBankReport ? 3 : 2;
        totalCell.style.textAlign = 'right';
        totalCell.style.fontWeight = 'bold';
        totalCell.style.padding = '8px';
        totalCell.textContent = 'الإجمالي';

        const totalAmountCell = footerRow.insertCell();
        totalAmountCell.style.fontWeight = 'bold';
        totalAmountCell.style.padding = '8px';
        totalAmountCell.textContent = formatCurrency(total);

        const tableHtml = table.outerHTML;

        const style = `
            <style>
                body { font-family: 'Cairo', sans-serif; direction: rtl; }
                table { width: 100%; border-collapse: collapse; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: right; }
                th { background-color: #f2f2f2; }
                tr:nth-child(even) { background-color: #f9f9f9; }
                @media print {
                    body * { visibility: hidden; }
                    #print-area, #print-area * { visibility: visible; }
                    #print-area { position: absolute; left: 0; top: 0; width: 100%; }
                }
            </style>
        `;

        const printWindow = window.open('', '_blank');
        printWindow?.document.write(`
            <html>
                <head>
                    <title>${title}</title>
                    <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700&display=swap" rel="stylesheet">
                    ${style}
                </head>
                <body>
                    <div id="print-area">
                        ${header}
                        ${tableHtml}
                    </div>
                </body>
            </html>
        `);
        printWindow?.document.close();
        printWindow?.focus();
        // Use a timeout to ensure content is loaded before printing
        setTimeout(() => {
            printWindow?.print();
            printWindow?.close();
        }, 250);
    };

    return (
        <div id={sectionId} className="bg-white p-6 rounded-2xl shadow-lg">
            <div className="flex justify-between items-center mb-4 border-b pb-2">
                <h2 className="text-xl font-bold">{title}</h2>
                <button 
                    onClick={handlePrintClick}
                    className="flex items-center gap-2 bg-sky-500 text-white font-bold py-2 px-3 rounded-lg hover:bg-sky-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 transition-colors duration-300 text-sm"
                >
                    <PrintIcon className="w-5 h-5" />
                    <span>طباعة</span>
                </button>
            </div>
            {transactions.length > 0 ? (
                <div className="max-h-[300px] overflow-y-auto">
                    <table className="w-full text-sm text-left text-gray-500 rtl:text-right">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 sticky top-0">
                            <tr>
                                <th scope="col" className="px-6 py-3">التاريخ</th>
                                <th scope="col" className="px-6 py-3">الوصف</th>
                                {isBankReport && <th scope="col" className="px-6 py-3">النوع</th>}
                                <th scope="col" className="px-6 py-3">المبلغ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {transactions.map(t => (
                                <tr key={t.id} className="bg-white border-b hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {new Date(t.date).toLocaleDateString('ar-EG', { day: '2-digit', month: '2-digit', year: 'numeric', numberingSystem: 'latn' })}
                                    </td>
                                    <td className="px-6 py-4 font-medium text-gray-900">{t.description}</td>
                                    {isBankReport && (
                                        <td className={`px-6 py-4 font-semibold ${t.type === TransactionType.INCOME ? 'text-green-600' : 'text-red-600'}`}>
                                            {t.type === TransactionType.INCOME ? 'إيراد' : 'مصروف'}
                                        </td>
                                    )}
                                    <td className={`px-6 py-4 font-bold ${isBankReport ? (t.type === TransactionType.INCOME ? 'text-green-600' : 'text-red-600') : 'text-slate-800' }`}>
                                        {isBankReport && (t.type === TransactionType.INCOME ? '+' : '-')}
                                        {formatCurrency(t.amount)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <p className="text-center text-gray-500 py-4">لا توجد بيانات لعرضها في هذا التقرير.</p>
            )}
        </div>
    );
};


export default App;