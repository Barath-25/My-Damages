import React, { useState } from 'react';
import { Transaction } from '../types';
import { format } from 'date-fns';
import { Trash2, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { db } from '../firebase';
import { deleteDoc, doc } from 'firebase/firestore';
import { motion } from 'motion/react';

interface TransactionListProps {
  transactions: Transaction[];
}

export default function TransactionList({ transactions }: TransactionListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'transactions', id));
      setDeletingId(null);
    } catch (error) {
      console.error('Error deleting transaction:', error);
    }
  };

  return (
    <div className="bg-white rounded-[2rem] border border-black/5 shadow-sm overflow-hidden">
      <div className="p-8 border-b border-black/5 flex items-center justify-between bg-brand-bg/10">
        <h3 className="text-2xl font-black text-brand-dark tracking-tight">Recent Activity</h3>
        <div className="text-xs font-black text-brand-dark/40 uppercase tracking-[0.2em]">
          {transactions.length} Transactions
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-brand-bg/20">
              <th className="px-8 py-5 text-[10px] font-black text-brand-dark/40 uppercase tracking-[0.2em]">Date</th>
              <th className="px-8 py-5 text-[10px] font-black text-brand-dark/40 uppercase tracking-[0.2em]">Category</th>
              <th className="px-8 py-5 text-[10px] font-black text-brand-dark/40 uppercase tracking-[0.2em]">Description</th>
              <th className="px-8 py-5 text-[10px] font-black text-brand-dark/40 uppercase tracking-[0.2em] text-right">Amount</th>
              <th className="px-8 py-5 text-[10px] font-black text-brand-dark/40 uppercase tracking-[0.2em] text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5">
            {transactions.map((t) => (
              <tr key={t.id} className="hover:bg-brand-bg/30 transition-colors group">
                <td className="px-8 py-6 text-sm font-black text-brand-dark/60">
                  {format(t.date.toDate(), 'MMM d, yyyy')}
                </td>
                <td className="px-8 py-6">
                  <span className="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider bg-brand-accent/10 text-brand-primary">
                    {t.category}
                  </span>
                </td>
                <td className="px-8 py-6 text-sm font-black text-brand-dark/80">
                  {t.description || '-'}
                </td>
                <td className={`px-8 py-6 text-sm font-black text-right ${
                  t.type === 'income' ? 'text-emerald-600' : 'text-rose-600'
                }`}>
                  <div className="flex items-center justify-end gap-1">
                    {t.type === 'income' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownLeft className="w-4 h-4" />}
                    ₹{t.amount.toLocaleString()}
                  </div>
                </td>
                <td className="px-8 py-6 text-center">
                  <button
                    onClick={() => t.id && setDeletingId(t.id)}
                    className="p-2.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </td>
              </tr>
            ))}
            {transactions.length === 0 && (
              <tr>
                <td colSpan={5} className="px-8 py-20 text-center text-brand-dark/30 font-black italic">
                  No transactions found. Start by adding one!
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Delete Confirmation Modal */}
      {deletingId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-brand-dark/40 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white p-10 rounded-[2.5rem] max-w-sm w-full shadow-2xl border border-black/5"
          >
            <h3 className="text-2xl font-black text-brand-dark mb-4 tracking-tight">Delete Transaction?</h3>
            <p className="text-brand-dark/60 mb-8 font-medium leading-relaxed">
              This action cannot be undone. Are you sure you want to remove this record?
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setDeletingId(null)}
                className="flex-1 py-4 px-6 rounded-2xl font-black text-brand-dark/60 hover:bg-brand-bg transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => deletingId && handleDelete(deletingId)}
                className="flex-1 py-4 px-6 rounded-2xl font-black bg-rose-500 text-white hover:bg-rose-600 shadow-lg shadow-rose-200 transition-all"
              >
                Delete
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
