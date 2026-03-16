import React, { useState, useMemo, useEffect, useRef } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, isSameWeek, isSameMonth } from 'date-fns';
import { Transaction, Account } from '../types';
import { ChevronLeft, ChevronRight, X, TrendingUp, TrendingDown, ArrowRightLeft, Wallet } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CalendarViewProps {
  transactions: Transaction[];
  accounts: Account[];
}

export default function CalendarView({ transactions, accounts }: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [activeWeekIndex, setActiveWeekIndex] = useState<number | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const todayRef = useRef<HTMLDivElement>(null);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  
  const weeks = useMemo(() => {
    const weeksList: Date[][] = [];
    let current = startOfWeek(monthStart);
    const end = endOfWeek(monthEnd);

    while (current <= end) {
      const weekDays = eachDayOfInterval({
        start: current,
        end: endOfWeek(current)
      });
      weeksList.push(weekDays);
      current = addMonths(current, 0); // Just a placeholder, actually increment by 7 days
      const nextWeekStart = new Date(current);
      nextWeekStart.setDate(current.getDate() + 7);
      current = nextWeekStart;
    }
    return weeksList;
  }, [currentMonth]);

  // Find ongoing week index
  const ongoingWeekIndex = useMemo(() => {
    const today = new Date();
    const index = weeks.findIndex(week => week.some(day => isSameDay(day, today)));
    return index !== -1 ? index : 0;
  }, [weeks]);

  // Scroll to today on mount or month change
  useEffect(() => {
    if (todayRef.current) {
      todayRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [weeks]);

  // Use ongoing week as default if no active week selected
  const displayWeekIndex = activeWeekIndex !== null ? activeWeekIndex : ongoingWeekIndex;

  const nextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
    setActiveWeekIndex(null);
  };
  const prevMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
    setActiveWeekIndex(null);
  };

  const selectedDateTransactions = selectedDate 
    ? transactions.filter(t => isSameDay(t.date.toDate(), selectedDate))
    : [];

  const getAccountName = (accountId: string) => {
    return accounts.find(a => a.id === accountId)?.name || 'Unknown Account';
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-4 md:p-8 rounded-[2rem] border border-black/5 shadow-sm overflow-hidden h-[700px] flex flex-col relative">
        <div className="flex items-center justify-between mb-8 flex-shrink-0">
          <div>
            <h3 className="text-2xl font-black text-brand-dark tracking-tight">{format(currentMonth, 'MMMM yyyy')}</h3>
            <p className="text-[10px] font-bold text-brand-dark/40 uppercase tracking-widest">Vertical Timeline View</p>
          </div>
          <div className="flex gap-3">
            <button onClick={prevMonth} className="p-3 hover:bg-brand-bg rounded-2xl transition-all border border-brand-accent/20">
              <ChevronLeft className="w-6 h-6 text-brand-dark" />
            </button>
            <button onClick={nextMonth} className="p-3 hover:bg-brand-bg rounded-2xl transition-all border border-brand-accent/20">
              <ChevronRight className="w-6 h-6 text-brand-dark" />
            </button>
          </div>
        </div>

        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto pr-4 -mr-4 space-y-10 scroll-smooth custom-scrollbar">
          {weeks.map((week, weekIndex) => (
            <div key={`week-${weekIndex}`} className="space-y-6">
              <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-md py-2 flex items-center gap-4">
                <span className="text-[10px] font-black text-brand-primary bg-brand-primary/10 px-3 py-1 rounded-full uppercase tracking-widest">
                  Week {weekIndex + 1}
                </span>
                <div className="h-px flex-1 bg-brand-primary/10" />
              </div>

              <div className="space-y-4">
                {week.map(day => {
                  const isCurrentMonth = isSameMonth(day, currentMonth);
                  if (!isCurrentMonth) return null;

                  const dayTransactions = transactions.filter(t => isSameDay(t.date.toDate(), day));
                  const income = dayTransactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
                  const expense = dayTransactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
                  const isToday = isSameDay(day, new Date());

                  return (
                    <motion.div
                      ref={isToday ? todayRef : null}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      key={day.toString()}
                      className={`group flex gap-4 md:gap-8 items-start p-4 md:p-6 rounded-[2rem] border transition-all ${
                        isToday ? 'bg-brand-primary/5 border-brand-primary shadow-lg shadow-brand-primary/5' : 'bg-white border-black/5 hover:border-brand-primary/20 hover:shadow-md'
                      }`}
                    >
                      <div className="flex flex-col items-center min-w-[50px] md:min-w-[70px]">
                        <span className="text-[10px] font-black text-brand-dark/30 uppercase tracking-widest mb-1">
                          {format(day, 'EEE')}
                        </span>
                        <span className={`text-2xl md:text-3xl font-black ${isToday ? 'text-brand-primary' : 'text-brand-dark'}`}>
                          {format(day, 'd')}
                        </span>
                        {isToday && (
                          <span className="text-[8px] font-black text-brand-primary uppercase tracking-widest mt-1">Today</span>
                        )}
                      </div>

                      <div className="flex-1 space-y-3">
                        {dayTransactions.length > 0 ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {dayTransactions.map(t => (
                              <button
                                key={t.id}
                                onClick={() => setSelectedDate(day)}
                                className="flex items-center justify-between p-3 bg-brand-bg/30 rounded-xl border border-brand-accent/5 hover:border-brand-primary/30 transition-all text-left group/item"
                              >
                                <div className="flex items-center gap-3 overflow-hidden">
                                  <div className={`p-2 rounded-lg ${
                                    t.type === 'income' ? 'bg-emerald-100 text-emerald-600' : 
                                    t.type === 'expense' ? 'bg-rose-100 text-rose-600' : 'bg-brand-bg text-brand-primary'
                                  }`}>
                                    {t.type === 'income' ? <TrendingUp className="w-3 h-3" /> : 
                                     t.type === 'expense' ? <TrendingDown className="w-3 h-3" /> : <ArrowRightLeft className="w-3 h-3" />}
                                  </div>
                                  <div className="truncate">
                                    <p className="text-xs font-bold text-brand-dark truncate">{t.description}</p>
                                    <p className="text-[8px] text-brand-dark/40 uppercase font-black tracking-widest">{t.category}</p>
                                  </div>
                                </div>
                                <span className={`text-sm font-black whitespace-nowrap ml-2 ${
                                  t.type === 'income' ? 'text-emerald-600' : 
                                  t.type === 'expense' ? 'text-rose-600' : 'text-brand-dark'
                                }`}>
                                  {t.type === 'income' ? '+' : t.type === 'expense' ? '-' : ''}₹{t.amount.toLocaleString()}
                                </span>
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="h-full flex items-center py-2">
                            <p className="text-[10px] font-bold text-brand-dark/20 uppercase tracking-widest italic">No transactions</p>
                          </div>
                        )}

                        {(income > 0 || expense > 0) && (
                          <div className="flex gap-4 pt-2 border-t border-black/5">
                            {income > 0 && (
                              <div className="flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">In: ₹{income.toLocaleString()}</span>
                              </div>
                            )}
                            {expense > 0 && (
                              <div className="flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                <span className="text-[10px] font-black text-rose-600 uppercase tracking-widest">Out: ₹{expense.toLocaleString()}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {selectedDate && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedDate(null)}
              className="absolute inset-0 bg-brand-dark/40 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white w-full max-w-2xl p-6 md:p-8 rounded-[2.5rem] border border-black/5 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h4 className="text-xl md:text-2xl font-black text-brand-dark tracking-tight">
                    {format(selectedDate, 'MMMM do, yyyy')}
                  </h4>
                  <p className="text-xs text-zinc-500 uppercase tracking-widest font-bold">
                    {selectedDateTransactions.length} {selectedDateTransactions.length === 1 ? 'Transaction' : 'Transactions'}
                  </p>
                </div>
                <button 
                  onClick={() => setSelectedDate(null)}
                  className="p-2 hover:bg-brand-bg rounded-xl transition-colors"
                >
                  <X className="w-6 h-6 text-brand-dark" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto pr-2 -mr-2 space-y-3">
                {selectedDateTransactions.length > 0 ? (
                  selectedDateTransactions.map(t => (
                    <div key={t.id} className="flex items-center justify-between p-4 bg-brand-bg/20 rounded-2xl border border-brand-accent/10">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                          t.type === 'income' ? 'bg-emerald-100 text-emerald-600' : 
                          t.type === 'expense' ? 'bg-rose-100 text-rose-600' : 'bg-brand-bg text-brand-primary'
                        }`}>
                          {t.type === 'income' ? <TrendingUp className="w-6 h-6" /> : 
                           t.type === 'expense' ? <TrendingDown className="w-6 h-6" /> : <ArrowRightLeft className="w-6 h-6" />}
                        </div>
                        <div>
                          <p className="font-bold text-brand-dark">{t.description}</p>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">{t.category}</span>
                            <span className="text-[10px] text-brand-dark/20">•</span>
                            <div className="flex items-center gap-1 text-[10px] text-brand-primary font-bold uppercase tracking-widest">
                              <Wallet className="w-3 h-3" />
                              {getAccountName(t.accountId)}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-lg font-black ${
                          t.type === 'income' ? 'text-emerald-600' : 
                          t.type === 'expense' ? 'text-rose-600' : 'text-brand-dark'
                        }`}>
                          {t.type === 'income' ? '+' : t.type === 'expense' ? '-' : ''}₹{t.amount.toLocaleString()}
                        </p>
                        <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">{t.paymentMethod}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 bg-brand-bg/10 rounded-2xl border border-dashed border-brand-accent/20">
                    <p className="text-zinc-500 font-bold">No transactions recorded for this day.</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

