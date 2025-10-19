import React from 'react';
import { TransactionType } from '../types';
import { SearchIcon, FilterIcon } from './Icons';

interface TransactionFilterProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  filterType: 'all' | TransactionType;
  onTypeChange: (type: 'all' | TransactionType) => void;
  startDate: string;
  onStartDateChange: (date: string) => void;
  endDate: string;
  onEndDateChange: (date: string) => void;
  onClearFilters: () => void;
}

const TransactionFilter: React.FC<TransactionFilterProps> = ({
  searchTerm,
  onSearchChange,
  filterType,
  onTypeChange,
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
  onClearFilters,
}) => {
  return (
    <div className="mb-6 pb-6 border-b border-gray-200">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-end">
            {/* Search by Description */}
            <div className="w-full md:flex-1">
                <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
                    بحث بالوصف
                </label>
                <div className="relative">
                     <span className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <SearchIcon className="w-5 h-5 text-gray-400" />
                    </span>
                    <input
                        type="search"
                        id="search"
                        placeholder="بحث..."
                        value={searchTerm}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="w-full pr-10 pl-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-rose-500 focus:border-rose-500"
                    />
                </div>
            </div>

            {/* Filter by Type */}
            <div className="w-full md:w-48">
                 <label htmlFor="type-filter" className="block text-sm font-medium text-gray-700 mb-1">
                    فلترة بالنوع
                </label>
                 <div className="relative">
                    <span className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <FilterIcon className="w-5 h-5 text-gray-400" />
                    </span>
                    <select 
                        id="type-filter"
                        value={filterType}
                        onChange={(e) => onTypeChange(e.target.value as 'all' | TransactionType)}
                        className="w-full appearance-none pr-10 pl-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-rose-500 focus:border-rose-500 bg-white"
                    >
                        <option value="all">الكل</option>
                        <option value={TransactionType.INCOME}>إيراد</option>
                        <option value={TransactionType.EXPENSE}>مصروف</option>
                    </select>
                </div>
            </div>

            {/* Filter by Date Range */}
            <div className="w-full md:flex-1">
                 <label htmlFor="start-date" className="block text-sm font-medium text-gray-700 mb-1">
                    نطاق التاريخ
                </label>
                <div className="flex items-center border border-gray-300 rounded-md shadow-sm bg-white focus-within:ring-1 focus-within:ring-rose-500 focus-within:border-rose-500">
                    <input
                        type="date"
                        id="start-date"
                        value={startDate}
                        onChange={(e) => onStartDateChange(e.target.value)}
                        className="w-full p-2 border-none bg-transparent focus:ring-0"
                    />
                    <span className="text-gray-400 rtl:border-r ltr:border-l border-gray-300 px-2">إلى</span>
                     <input
                        type="date"
                        id="end-date"
                        value={endDate}
                        onChange={(e) => onEndDateChange(e.target.value)}
                        className="w-full p-2 border-none bg-transparent focus:ring-0"
                    />
                </div>
            </div>
            
            {/* Clear Button */}
            <div className="w-full md:w-auto">
                <button
                    onClick={onClearFilters}
                    className="w-full md:w-auto bg-slate-200 text-slate-700 font-bold py-2 px-4 rounded-lg hover:bg-slate-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-400 transition-colors duration-300 whitespace-nowrap"
                >
                    مسح الفلاتر
                </button>
            </div>
        </div>
    </div>
  );
};

export default TransactionFilter;