import React, { useMemo, useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { Transaction } from '../types';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isWithinInterval } from 'date-fns';
import { TrendingUp, TrendingDown, Wallet, Eye, EyeOff, AlertCircle, CheckCircle, User as UserIcon } from 'lucide-react';
import { db, auth } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

interface DashboardProps {
  transactions: Transaction[];
}

const COLORS = ['#427A76', '#F9B487', '#174143', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

export default function Dashboard({ transactions }: DashboardProps) {
  const [showBalance, setShowBalance] = useState(false);
  const [budget, setBudget] = useState<number | null>(null);
  const [totalOwed, setTotalOwed] = useState(0);
  const currentMonth = new Date().toISOString().slice(0, 7);

  useEffect(() => {
    const fetchBudget = async () => {
      if (!auth.currentUser) return;
      const budgetQuery = query(
        collection(db, 'budgets'),
        where('uid', '==', auth.currentUser.uid),
        where('month', '==', currentMonth)
      );
      const snapshot = await getDocs(budgetQuery);
      if (!snapshot.empty) {
        setBudget(snapshot.docs[0].data().amount);
      }
    };

    const fetchDebts = async () => {
      if (!auth.currentUser) return;
      const debtQuery = query(
        collection(db, 'debts'),
        where('uid', '==', auth.currentUser.uid),
        where('isPaid', '==', false)
      );
      const snapshot = await getDocs(debtQuery);
      const total = snapshot.docs.reduce((acc, doc) => acc + (doc.data().amount || 0), 0);
      setTotalOwed(total);
    };

    fetchBudget();
    fetchDebts();
  }, [currentMonth]);

  const stats = useMemo(() => {
    const income = transactions
      .filter(t => t.type === 'income')
      .reduce((acc, t) => acc + t.amount, 0);
    const expense = transactions
      .filter(t => t.type === 'expense')
      .reduce((acc, t) => acc + t.amount, 0);
    const transfers = transactions
      .filter(t => t.type === 'transfer')
      .reduce((acc, t) => acc + t.amount, 0);
    
    const monthStart = startOfMonth(new Date());
    const monthEnd = endOfMonth(new Date());
    const currentMonthExpense = transactions
      .filter(t => t.type === 'expense' && isWithinInterval(t.date.toDate(), { start: monthStart, end: monthEnd }))
      .reduce((acc, t) => acc + t.amount, 0);

    return { 
      income, 
      expense, 
      balance: income + transfers - expense, 
      currentMonthExpense 
    };
  }, [transactions]);

  const weeklyData = useMemo(() => {
    const now = new Date();
    const start = startOfMonth(now);
    const end = endOfMonth(now);
    const days = eachDayOfInterval({ start, end });

    const weeks = [
      { name: 'Week 1', income: 0, expense: 0 },
      { name: 'Week 2', income: 0, expense: 0 },
      { name: 'Week 3', income: 0, expense: 0 },
      { name: 'Week 4', income: 0, expense: 0 },
    ];

    days.forEach(day => {
      const dayTransactions = transactions.filter(t => isSameDay(t.date.toDate(), day));
      const dayIncome = dayTransactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
      const dayExpense = dayTransactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
      
      const dayOfMonth = day.getDate();
      let weekIndex = Math.floor((dayOfMonth - 1) / 7);
      if (weekIndex > 3) weekIndex = 3; // Put remaining days in week 4

      weeks[weekIndex].income += dayIncome;
      weeks[weekIndex].expense += dayExpense;
    });

    return weeks;
  }, [transactions]);

  const maxExpense = Math.max(...weeklyData.map(d => d.expense), 100);
  const yAxisTicks = [0, maxExpense * 0.25, maxExpense * 0.5, maxExpense * 0.75, maxExpense];

  const categoryData = useMemo(() => {
    const categories: Record<string, number> = {};
    transactions
      .filter(t => t.type === 'expense')
      .forEach(t => {
        categories[t.category] = (categories[t.category] || 0) + t.amount;
      });
    return Object.entries(categories).map(([name, value]) => ({ name, value }));
  }, [transactions]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-6 rounded-3xl border border-black/5 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-emerald-50 rounded-xl">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
            </div>
            <span className="text-xs font-bold text-brand-dark/60 uppercase tracking-widest">Total Income</span>
          </div>
          <div className="text-2xl font-bold text-brand-dark">${stats.income.toLocaleString()}</div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-black/5 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-rose-50 rounded-xl">
              <TrendingDown className="w-5 h-5 text-rose-600" />
            </div>
            <span className="text-xs font-bold text-brand-dark/60 uppercase tracking-widest">Total Expenses</span>
          </div>
          <div className="text-2xl font-bold text-brand-dark">${stats.expense.toLocaleString()}</div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-black/5 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-brand-bg rounded-xl">
              <UserIcon className="w-5 h-5 text-brand-primary" />
            </div>
            <span className="text-xs font-bold text-brand-dark/60 uppercase tracking-widest">People Owe Me</span>
          </div>
          <div className="text-2xl font-bold text-brand-dark">
            {showBalance ? `$${totalOwed.toLocaleString()}` : '••••••'}
          </div>
        </div>

        <div className="bg-brand-primary p-6 rounded-3xl border border-black/5 shadow-lg shadow-brand-primary/20">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-xl">
                <Wallet className="w-5 h-5 text-white" />
              </div>
              <span className="text-xs font-bold text-white/80 uppercase tracking-widest">Net Balance</span>
            </div>
            <button 
              onClick={() => setShowBalance(!showBalance)}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              {showBalance ? <EyeOff className="w-4 h-4 text-white" /> : <Eye className="w-4 h-4 text-white" />}
            </button>
          </div>
          <div className="text-2xl font-bold text-white">
            {showBalance ? `$${stats.balance.toLocaleString()}` : '••••••'}
          </div>
        </div>

        <div className={`p-6 rounded-3xl border border-black/5 shadow-sm transition-all duration-500 ${
          budget 
            ? (stats.currentMonthExpense > budget 
                ? 'bg-rose-500 text-white border-rose-600' 
                : (stats.currentMonthExpense > budget * 0.9 
                    ? 'bg-amber-500 text-white border-amber-600' 
                    : (stats.currentMonthExpense > budget * 0.5 
                        ? 'bg-brand-primary text-white border-brand-primary' 
                        : 'bg-emerald-500 text-white border-emerald-600')))
            : 'bg-white'
        }`}>
          <div className="flex items-center gap-3 mb-2">
            <div className={`p-2 rounded-xl ${
              budget ? 'bg-white/20' : 'bg-brand-bg'
            }`}>
              {budget ? (
                stats.currentMonthExpense > budget 
                  ? <AlertCircle className="w-5 h-5 text-white" /> 
                  : <CheckCircle className="w-5 h-5 text-white" />
              ) : (
                <Wallet className="w-5 h-5 text-brand-dark/40" />
              )}
            </div>
            <span className={`text-xs font-bold uppercase tracking-widest ${budget ? 'text-white/80' : 'text-brand-dark/60'}`}>
              Budget Status
            </span>
          </div>
          <div className="text-2xl font-black">
            {budget ? (
              <div className="flex flex-col">
                <span>
                  {stats.currentMonthExpense > budget 
                    ? 'CRITICAL' 
                    : (stats.currentMonthExpense > budget * 0.9 
                        ? 'WARNING' 
                        : (stats.currentMonthExpense > budget * 0.5 
                            ? 'CAUTION' 
                            : 'SAFE'))}
                </span>
                <span className="text-[10px] uppercase tracking-widest opacity-60">
                  {stats.currentMonthExpense > budget ? 'Over Limit' : 'Within Limit'}
                </span>
              </div>
            ) : (
              <span className="text-sm text-brand-dark/40 italic">Not set</span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-black/5 shadow-sm">
          <h3 className="text-lg font-semibold text-zinc-900 mb-6">Weekly Activity (This Month)</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#71717a' }} />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: '#71717a' }}
                  ticks={yAxisTicks}
                  tickFormatter={(value) => `$${Math.round(value)}`}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  cursor={{ fill: '#f4f4f5' }}
                />
                <Bar dataKey="income" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-black/5 shadow-sm">
          <h3 className="text-lg font-semibold text-zinc-900 mb-6">Expense by Category</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-4">
            {categoryData.map((entry, index) => (
              <div key={entry.name} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                <span className="text-xs text-zinc-600 truncate">{entry.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
