import React, { useState } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, isSameMonth } from 'date-fns';
import { Transaction } from '../types';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CalendarViewProps {
  transactions: Transaction[];
}

export default function CalendarView({ transactions }: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const days = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth)
  });

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  return (
    <div className="bg-white p-4 md:p-8 rounded-[2rem] border border-black/5 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between mb-6 md:mb-10">
        <h3 className="text-xl md:text-2xl font-black text-brand-dark tracking-tight">{format(currentMonth, 'MMMM yyyy')}</h3>
        <div className="flex gap-2 md:gap-3">
          <button onClick={prevMonth} className="p-2 md:p-3 hover:bg-brand-bg rounded-2xl transition-all border border-brand-accent/20">
            <ChevronLeft className="w-5 h-5 md:w-6 md:h-6 text-brand-dark" />
          </button>
          <button onClick={nextMonth} className="p-2 md:p-3 hover:bg-brand-bg rounded-2xl transition-all border border-brand-accent/20">
            <ChevronRight className="w-5 h-5 md:w-6 md:h-6 text-brand-dark" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 md:gap-3">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
          <div key={`${day}-${index}`} className="py-2 text-center text-[8px] md:text-[10px] font-black text-brand-dark/40 uppercase tracking-[0.1em] md:tracking-[0.2em]">
            {day}
          </div>
        ))}
        
        {Array.from({ length: days[0].getDay() }).map((_, i) => (
          <div key={`empty-${i}`} className="min-h-[60px] md:min-h-[120px]" />
        ))}

        {days.map(day => {
          const dayTransactions = transactions.filter(t => isSameDay(t.date.toDate(), day));
          const income = dayTransactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
          const expense = dayTransactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);

          return (
            <div key={day.toString()} className="bg-brand-bg/30 min-h-[60px] md:min-h-[120px] p-1 md:p-4 rounded-xl md:rounded-2xl border border-brand-accent/10 hover:border-brand-primary transition-all group">
              <div className="text-[10px] md:text-sm font-black text-brand-dark/30 mb-1 md:mb-2 group-hover:text-brand-primary transition-colors">{format(day, 'd')}</div>
              <div className="space-y-1">
                {income > 0 && (
                  <div className="text-[8px] md:text-[10px] font-black text-emerald-700 bg-emerald-100 px-1 md:px-2 py-0.5 md:py-1 rounded-md md:rounded-lg truncate">
                    +${income.toLocaleString()}
                  </div>
                )}
                {expense > 0 && (
                  <div className="text-[8px] md:text-[10px] font-black text-rose-700 bg-rose-100 px-1 md:px-2 py-0.5 md:py-1 rounded-md md:rounded-lg truncate">
                    -${expense.toLocaleString()}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
