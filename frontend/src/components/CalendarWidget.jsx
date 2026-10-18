import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, AlertTriangle, Hammer, CreditCard, Key } from 'lucide-react';

const CalendarWidget = ({ events }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Helper to get number of days in month
  const getDaysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
  const getFirstDayOfMonth = (y, m) => new Date(y, m, 1).getDay(); // 0 is Sunday

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Check if a specific day has events
  const getEventsForDay = (day) => {
    if (!events) return [];
    return events.filter(e => {
      const eventDate = new Date(e.date);
      return (
        eventDate.getDate() === day &&
        eventDate.getMonth() === month &&
        eventDate.getFullYear() === year
      );
    });
  };

  // Render Days Grid
  const renderDays = () => {
    const cells = [];
    
    // Empty cells for previous month padding
    for (let i = 0; i < firstDay; i++) {
      cells.push(<div key={`empty-${i}`} className="p-2 border border-slate-100/30 dark:border-slate-800/10 min-h-16" />);
    }

    // Days of current month
    for (let day = 1; day <= daysInMonth; day++) {
      const dayEvents = getEventsForDay(day);
      const isToday = 
        day === new Date().getDate() && 
        month === new Date().getMonth() && 
        year === new Date().getFullYear();

      cells.push(
        <div
          key={`day-${day}`}
          className={`p-2 border border-slate-100/30 dark:border-slate-800/10 min-h-16 flex flex-col justify-between transition-all group hover:bg-brand-500/5 ${isToday ? 'bg-brand-500/10 border-brand-500' : ''}`}
        >
          <span className={`text-xs font-semibold ${isToday ? 'text-brand-500 font-extrabold' : 'text-slate-700 dark:text-slate-300'}`}>
            {day}
          </span>
          <div className="flex flex-wrap gap-1 mt-1">
            {dayEvents.slice(0, 3).map((ev, idx) => {
              // Color map by type
              let color = 'bg-brand-500';
              if (ev.type === 'billing') color = 'bg-emerald-500';
              if (ev.type === 'maintenance') color = 'bg-amber-500';
              if (ev.type === 'lease') color = 'bg-[#B97843]';
              if (ev.type === 'visit') color = 'bg-[#4B1715]';

              return (
                <div
                  key={idx}
                  title={`${ev.title}: ${ev.description}`}
                  className={`w-1.5 h-1.5 rounded-full ${color}`}
                />
              );
            })}
            {dayEvents.length > 3 && (
              <span className="text-[8px] text-slate-400">+{dayEvents.length - 3}</span>
            )}
          </div>
        </div>
      );
    }

    return cells;
  };

  // Collect current active events list
  const activeEvents = events
    ? events.filter(e => {
        const evDate = new Date(e.date);
        return evDate.getMonth() === month && evDate.getFullYear() === year;
      })
    : [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Calendar Grid */}
      <div className="lg:col-span-2 glass-panel rounded-3xl p-5 border border-cream-300 dark:border-espresso-800">
        <div className="flex justify-between items-center mb-4">
          <h4 className="font-extrabold text-espresso dark:text-cream-50 Outfit text-base">
            {monthNames[month]} {year}
          </h4>
          <div className="flex gap-2">
            <button onClick={prevMonth} className="p-1.5 rounded-xl bg-cream-100 dark:bg-espresso-900 hover:bg-cream-200 text-espresso dark:text-cream-200 border border-cream-300 dark:border-espresso-800 transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={nextMonth} className="p-1.5 rounded-xl bg-cream-100 dark:bg-espresso-900 hover:bg-cream-200 text-espresso dark:text-cream-200 border border-cream-300 dark:border-espresso-800 transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Days Header */}
        <div className="grid grid-cols-7 gap-1 text-center mb-1 text-[10px] uppercase font-bold text-cream-600 dark:text-cream-400 tracking-wider">
          <div>Sun</div>
          <div>Mon</div>
          <div>Tue</div>
          <div>Wed</div>
          <div>Thu</div>
          <div>Fri</div>
          <div>Sat</div>
        </div>

        {/* Calendar days grid */}
        <div className="grid grid-cols-7 gap-1 bg-cream-100/40 dark:bg-espresso-950/40 rounded-2xl overflow-hidden border border-cream-200 dark:border-espresso-900">
          {renderDays()}
        </div>
      </div>

      {/* Events Details Drawer sidebar */}
      <div className="glass-panel rounded-3xl p-5 border border-cream-300 dark:border-espresso-800 flex flex-col">
        <h4 className="font-extrabold text-espresso dark:text-cream-50 Outfit text-sm mb-3 border-b border-cream-200 dark:border-espresso-800 pb-2">
          Schedules for {monthNames[month]}
        </h4>

        <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[300px] lg:max-h-[380px]">
          {activeEvents.length === 0 ? (
            <div className="h-full flex items-center justify-center text-center text-xs text-cream-500 py-10">
              No tasks scheduled for this period.
            </div>
          ) : (
            activeEvents.map((ev, idx) => {
              let Icon = Calendar;
              let border = 'border-cream-300 dark:border-espresso-800';
              let badge = 'bg-brand-500/10 text-brand-600';
              
              if (ev.type === 'billing') {
                Icon = CreditCard;
                border = 'border-emerald-500/20';
                badge = 'bg-emerald-500/10 text-emerald-600';
              }
              if (ev.type === 'maintenance') {
                Icon = Hammer;
                border = 'border-amber-500/20';
                badge = 'bg-amber-500/10 text-amber-600';
              }
              if (ev.type === 'lease') {
                Icon = Key;
                border = 'border-brand-500/20';
                badge = 'bg-brand-500/10 text-brand-600';
              }

              return (
                <div key={idx} className={`p-3 rounded-2xl bg-cream-50/70 dark:bg-espresso-900/40 border ${border} flex gap-3 items-start`}>
                  <div className={`p-2 rounded-xl ${badge}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold text-cream-500 block font-mono">
                      {new Date(ev.date).toLocaleDateString()}
                    </span>
                    <h5 className="font-bold text-xs text-espresso dark:text-cream-100 mt-0.5">
                      {ev.title}
                    </h5>
                    <p className="text-[10px] text-cream-600 dark:text-cream-400 mt-0.5 leading-relaxed">
                      {ev.description}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default CalendarWidget;
