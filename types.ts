
export enum PaymentMethod {
  CASH = 'CASH',
  BANK = 'BANK',
}

export enum TransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
}

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: TransactionType;
  date: string; 
  paymentMethod: PaymentMethod;
}
