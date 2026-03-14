import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { Transaction } from '../types';
import { ChevronRight, ChevronDown, Calendar, CreditCard, ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';

interface MonthData {
  total: number;
  transactions: Transaction[];
}

interface YearData {
  total: number;
  months: { [key: string]: MonthData };
}

interface GroupedData {
  [key: string]: YearData;
}

export default function SpendingHistory() {
  const [groupedData, setGroupedData] = useState<GroupedData>({});
  const [expandedYears, setExpandedYears] = useState<Set<string>>(new Set());
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.currentUser) return;

    // Fetch ALL transactions for the user across all accounts
    const q = query(
      collection(db, 'transactions'),
      where('uid', '==', auth.currentUser.uid),
      orderBy('date', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: GroupedData = {};
      
      snapshot.docs.forEach(doc => {
        const tx = { id: doc.id, ...doc.data() } as Transaction;
        const date = tx.date.toDate();
        const year = date.getFullYear().toString();
        const month = format(date, 'MMMM');
        const monthKey = `${year}-${month}`;

        if (!data[year]) {
          data[year] = { total: 0, months: {} };
        }
        if (!data[year].months[month]) {
          data[year].months[month] = { total: 0, transactions: [] };
        }

        if (tx.type === 'expense') {
          data[year].total += tx.amount;
          data[year].months[month].total += tx.amount;
        }
        
        data[year].months[month].transactions.push(tx);
      });

      setGroupedData(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const toggleYear = (year: string) => {
    const newSet = new Set(expandedYears);
    if (newSet.has(year)) newSet.delete(year);
    else newSet.add(year);
    setExpandedYears(newSet);
  };

  const toggleMonth = (monthKey: string) => {
    const newSet = new Set(expandedMonths);
    if (newSet.has(monthKey)) newSet.delete(monthKey);
    else newSet.add(monthKey);
    setExpandedMonths(newSet);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-brand-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const years = Object.keys(groupedData).sort((a, b) => b.localeCompare(a));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-brand-bg rounded-2xl">
          <Calendar className="w-6 h-6 text-brand-primary" />
        </div>
        <h3 className="text-xl font-black text-brand-dark">Spending History</h3>
      </div>

      {years.length === 0 ? (
        <div className="text-center py-12 bg-brand-bg/20 rounded-[2rem] border-2 border-dashed border-brand-accent/20">
          <p className="text-brand-dark/40 font-black italic">No transactions found yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {years.map(year => (
            <div key={year} className="bg-white rounded-3xl border border-black/5 overflow-hidden shadow-sm">
              <button
                onClick={() => toggleYear(year)}
                className="w-full flex items-center justify-between p-6 hover:bg-brand-bg/30 transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-xl transition-all ${expandedYears.has(year) ? 'bg-brand-primary text-white' : 'bg-brand-bg text-brand-dark/40'}`}>
                    {expandedYears.has(year) ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                  </div>
                  <span className="text-xl font-black text-brand-dark">{year}</span>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-brand-dark/40 uppercase tracking-widest">Total Spent</p>
                  <p className="text-lg font-black text-brand-primary">${groupedData[year].total.toLocaleString()}</p>
                </div>
              </button>

              <AnimatePresence>
                {expandedYears.has(year) && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden border-t border-black/5 bg-brand-bg/10"
                  >
                    <div className="p-4 space-y-2">
                      {Object.keys(groupedData[year].months).map(month => {
                        const monthKey = `${year}-${month}`;
                        const isExpanded = expandedMonths.has(monthKey);
                        return (
                          <div key={month} className="bg-white rounded-2xl border border-black/5 overflow-hidden">
                            <button
                              onClick={() => toggleMonth(monthKey)}
                              className="w-full flex items-center justify-between p-4 hover:bg-brand-bg/50 transition-all"
                            >
                              <div className="flex items-center gap-3">
                                <div className={`p-1.5 rounded-lg transition-all ${isExpanded ? 'bg-brand-primary/20 text-brand-primary' : 'bg-brand-bg text-brand-dark/20'}`}>
                                  {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                </div>
                                <span className="font-bold text-brand-dark">{month}</span>
                              </div>
                              <div className="text-right">
                                <p className="text-[10px] font-bold text-brand-dark/30 uppercase tracking-widest">Spent</p>
                                <p className="font-black text-brand-dark">${groupedData[year].months[month].total.toLocaleString()}</p>
                              </div>
                            </button>

                            <AnimatePresence>
                              {isExpanded && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  className="overflow-hidden border-t border-black/5"
                                >
                                  <div className="divide-y divide-black/5">
                                    {groupedData[year].months[month].transactions.map(tx => (
                                      <div key={tx.id} className="p-4 flex items-center justify-between hover:bg-brand-bg/20 transition-all">
                                        <div className="flex items-center gap-3">
                                          <div className={`p-2 rounded-xl ${tx.type === 'income' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                            {tx.type === 'income' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                                          </div>
                                          <div>
                                            <p className="text-sm font-bold text-brand-dark">{tx.category}</p>
                                            <p className="text-[10px] font-medium text-brand-dark/40">{format(tx.date.toDate(), 'MMM dd, HH:mm')}</p>
                                          </div>
                                        </div>
                                        <p className={`font-black ${tx.type === 'income' ? 'text-emerald-600' : 'text-brand-dark'}`}>
                                          {tx.type === 'income' ? '+' : '-'}${tx.amount.toLocaleString()}
                                        </p>
                                      </div>
                                    ))}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
