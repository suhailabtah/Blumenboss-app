import React from 'react';
import { TransactionType } from '../types';

interface TransactionFormProps {
  description: string;
  onDescriptionChange: (value: string) => void;
  amount: string;
  onAmountChange: (value: string) => void;
  type: TransactionType;
  onTypeChange: (type: TransactionType) => void;
  onSubmit: (e: React.FormEvent) => void;
}

const TransactionForm: React.FC<TransactionFormProps> = ({
  description,
  onDescriptionChange,
  amount,
  onAmountChange,
  type,
  onTypeChange,
  onSubmit,
}) => {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
          الوصف
        </label>
        <input
          type="text"
          id="description"
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder="مثال: باقة ورد زفاف"
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-rose-500 focus:border-rose-500"
        />
      </div>
      <div>
        <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
          المبلغ (€)
        </label>
        <input
          type="number"
          id="amount"
          value={amount}
          onChange={(e) => onAmountChange(e.target.value)}
          placeholder="0.00"
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-rose-500 focus:border-rose-500"
        />
      </div>
      <div className="flex items-center space-x-4 rtl:space-x-reverse">
        <label className="block text-sm font-medium text-gray-700">النوع:</label>
        <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="type" value={TransactionType.INCOME} checked={type === TransactionType.INCOME} onChange={() => onTypeChange(TransactionType.INCOME)} className="form-radio h-4 w-4 text-green-600 focus:ring-green-500"/>
                <span>إيراد</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="type" value={TransactionType.EXPENSE} checked={type === TransactionType.EXPENSE} onChange={() => onTypeChange(TransactionType.EXPENSE)} className="form-radio h-4 w-4 text-red-600 focus:ring-red-500"/>
                <span>مصروف</span>
            </label>
        </div>
      </div>
      <button
        type="submit"
        className="w-full bg-rose-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-rose-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-500 transition-colors duration-300"
      >
        إضافة العملية
      </button>
    </form>
  );
};

export default TransactionForm;