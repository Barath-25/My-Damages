import React, { useState } from 'react';
import { db, auth } from '../firebase';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { PlusCircle, X } from 'lucide-react';
import { TransactionType, Account } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface TransactionFormProps {
  accounts: Account[];
  selectedAccountId: string;
  cashAccount?: Account;
  onClose?: () => void;
}

const CATEGORIES = {
  income: ['Salary', 'Freelance', 'Gift', 'Investment', 'Others'],
  expense: ['Food', 'Academics', 'Transportation', 'Others']
};

export default function TransactionForm({ accounts, selectedAccountId, cashAccount, onClose }: TransactionFormProps) {
  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [otherCategory, setOtherCategory] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [accountId, setAccountId] = useState(selectedAccountId);
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'cash'>('upi');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    setLoading(true);
    try {
      const finalAccountId = paymentMethod === 'cash' ? (cashAccount?.id || accountId) : accountId;
      
      await addDoc(collection(db, 'transactions'), {
        amount: parseFloat(amount),
        type: paymentMethod === 'cash' && type === 'income' ? 'transfer' : type,
        paymentMethod,
        category: category === 'Others' ? otherCategory : category,
        otherCategory: category === 'Others' ? otherCategory : '',
        date: Timestamp.fromDate(new Date(date)),
        description: category === 'Others' ? otherCategory : '',
        uid: auth.currentUser.uid,
        accountId: finalAccountId,
        createdAt: Timestamp.now()
      });
      
      setAmount('');
      setCategory('');
      setOtherCategory('');
      if (onClose) onClose();
    } catch (error) {
      console.error('Error adding transaction:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-3xl shadow-xl border border-black/5">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-brand-dark">Add Transaction</h2>
        {onClose && (
          <button onClick={onClose} className="p-2 hover:bg-brand-bg rounded-full transition-colors">
            <X className="w-5 h-5 text-zinc-400" />
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex p-1 bg-brand-bg rounded-xl">
          <button
            type="button"
            onClick={() => setType('expense')}
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
              type === 'expense' ? 'bg-white shadow-sm text-brand-dark' : 'text-zinc-500 hover:text-brand-dark'
            }`}
          >
            Expense
          </button>
          <button
            type="button"
            onClick={() => setType('income')}
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
              type === 'income' ? 'bg-white shadow-sm text-brand-dark' : 'text-zinc-500 hover:text-brand-dark'
            }`}
          >
            {paymentMethod === 'cash' ? 'Add to Cash' : 'Income'}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-bold text-brand-dark/60 uppercase tracking-widest mb-1">Payment Method</label>
            <div className="flex p-1 bg-brand-bg rounded-xl">
              <button
                type="button"
                onClick={() => setPaymentMethod('upi')}
                className={`flex-1 py-2 text-[10px] font-bold rounded-lg transition-all ${
                  paymentMethod === 'upi' ? 'bg-white shadow-sm text-brand-dark' : 'text-zinc-500 hover:text-brand-dark'
                }`}
              >
                UPI
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('cash')}
                className={`flex-1 py-2 text-[10px] font-bold rounded-lg transition-all ${
                  paymentMethod === 'cash' ? 'bg-white shadow-sm text-brand-dark' : 'text-zinc-500 hover:text-brand-dark'
                }`}
              >
                Cash
              </button>
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-brand-dark/60 uppercase tracking-widest mb-1">Amount</label>
            <input
              type="number"
              required
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="₹0.00"
              className="w-full px-4 py-2 bg-brand-bg/30 border border-brand-accent/20 rounded-xl focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none transition-all text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {paymentMethod === 'upi' ? (
            <div>
              <label className="block text-[10px] font-bold text-brand-dark/60 uppercase tracking-widest mb-1">Account</label>
              <select
                required
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full px-4 py-2 bg-brand-bg/30 border border-brand-accent/20 rounded-xl focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none transition-all text-sm"
              >
                {accounts
                  .filter(acc => acc.name.toLowerCase() !== 'cash')
                  .map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.name}</option>
                  ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-[10px] font-bold text-brand-dark/60 uppercase tracking-widest mb-1">Account</label>
              <div className="w-full px-4 py-2 bg-brand-bg/30 border border-brand-accent/20 rounded-xl text-sm font-bold text-brand-dark/50">
                Cash Account
              </div>
            </div>
          )}
          <div>
            <label className="block text-[10px] font-bold text-brand-dark/60 uppercase tracking-widest mb-1">Date</label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-4 py-2 bg-brand-bg/30 border border-brand-accent/20 rounded-xl focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none transition-all text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-brand-dark/60 uppercase tracking-widest mb-3">Category</label>
          <div className="grid grid-cols-2 gap-3">
            {(CATEGORIES[type as keyof typeof CATEGORIES] || []).map((cat: string) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`flex flex-col items-center justify-center py-4 px-2 rounded-2xl border-2 transition-all duration-200 ${
                  category === cat
                    ? 'bg-brand-primary border-brand-primary text-white shadow-lg shadow-brand-primary/20 scale-[1.02]'
                    : 'bg-white border-brand-accent/10 text-brand-dark/60 hover:border-brand-primary/30 hover:bg-brand-bg/50'
                }`}
              >
                <span className="text-sm font-black tracking-tight">{cat}</span>
              </button>
            ))}
          </div>
        </div>

        <AnimatePresence>
          {category === 'Others' && (
            <motion.div 
              initial={{ opacity: 0, height: 0, marginTop: 0 }}
              animate={{ opacity: 1, height: 'auto', marginTop: 16 }}
              exit={{ opacity: 0, height: 0, marginTop: 0 }}
              className="overflow-hidden"
            >
              <label className="block text-[10px] font-bold text-brand-dark/60 uppercase tracking-widest mb-2">What did you spend on?</label>
              <input
                type="text"
                required
                value={otherCategory}
                onChange={(e) => setOtherCategory(e.target.value)}
                placeholder="e.g. Movie tickets, Gift, etc."
                className="w-full px-4 py-3 bg-brand-bg/50 border-2 border-brand-accent/10 rounded-2xl focus:ring-4 focus:ring-brand-primary/10 focus:border-brand-primary outline-none transition-all text-sm font-medium"
              />
            </motion.div>
          )}
        </AnimatePresence>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 bg-brand-primary text-white rounded-2xl font-bold hover:bg-brand-dark transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-brand-primary/20"
        >
          <PlusCircle className="w-5 h-5" />
          {loading ? 'Adding...' : 'Add Transaction'}
        </button>
      </form>
    </div>
  );
}
