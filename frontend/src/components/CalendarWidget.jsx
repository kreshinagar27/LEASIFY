import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Hammer,
  CreditCard,
  Key,
  Calendar,
  CalendarDays,
  Clock,
  Filter,
  CheckCircle,
  X
} from 'lucide-react';

const CalendarWidget = ({ events = [] }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);
  const [filterType, setFilterType] = useState('all');

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
    setSelectedDay(null);
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setSelectedDay(null);
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDay(today.getDate());
  };

  // Check if a specific day has events
  const getEventsForDay = (day) => {
    if (!events || !events.length) return [];
    return events.filter(e => {
      if (!e.date) return false;
      const eventDate = new Date(e.date);
      if (isNaN(eventDate.getTime())) return false;
      return (
        eventDate.getDate() === day &&
        eventDate.getMonth() === month &&
        eventDate.getFullYear() === year
      );
    });
  };

  // Collect current active events list for this month
  const monthEvents = (events || []).filter(e => {
    if (!e.date) return false;
    const evDate = new Date(e.date);
    if (isNaN(evDate.getTime())) return false;
    return evDate.getMonth() === month && evDate.getFullYear() === year;
  });

  // Filter events based on selectedDay and filterType
  const displayedEvents = monthEvents.filter(ev => {
    const evDate = new Date(ev.date);
    const matchesDay = selectedDay ? evDate.getDate() === selectedDay : true;
    const matchesType = filterType === 'all' ? true : ev.type === filterType;
    return matchesDay && matchesType;
  });

  // Render Days Grid
  const renderDays = () => {
    const cells = [];
    const today = new Date();

    // Empty cells for previous month padding
    for (let i = 0; i < firstDay; i++) {
      cells.push(
        <div
          key={`empty-${i}`}
          className="p-2 border border-[#D9CBBB]/30 dark:border-[#38251F]/30 min-h-20 bg-black/[0.01] dark:bg-white/[0.01]"
        />
      );
    }

    // Days of current month
    for (let day = 1; day <= daysInMonth; day++) {
      const dayEvents = getEventsForDay(day);
      const isToday =
        day === today.getDate() &&
        month === today.getMonth() &&
        year === today.getFullYear();
      const isSelected = selectedDay === day;

      cells.push(
        <button
          type="button"
          key={`day-${day}`}
          onClick={() => setSelectedDay(selectedDay === day ? null : day)}
          className={`p-2 border border-[#D9CBBB]/30 dark:border-[#38251F]/30 min-h-20 flex flex-col justify-between text-left transition-all relative group cursor-pointer focus:outline-none ${
            isSelected
              ? 'bg-brand-500/15 border-brand-500/80 ring-2 ring-brand-500/60 dark:bg-brand-500/25'
              : isToday
              ? 'bg-amber-500/10 border-amber-500/50'
              : 'hover:bg-brand-500/5 dark:hover:bg-brand-500/10'
          }`}
        >
          <div className="flex items-center justify-between w-full">
            <span
              className={`text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold ${
                isSelected
                  ? 'bg-brand-600 text-white shadow-xs'
                  : isToday
                  ? 'bg-amber-600 text-white font-extrabold shadow-xs'
                  : 'text-[#38251F] dark:text-[#FAF7F1]'
              }`}
            >
              {day}
            </span>
            {dayEvents.length > 0 && (
              <span className="text-[9px] font-black px-1.5 py-0.2 rounded-full bg-[#E9DFD0] dark:bg-[#352520] text-[#78685D] dark:text-[#D1C1B0]">
                {dayEvents.length}
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-1 mt-1.5 w-full">
            {dayEvents.slice(0, 3).map((ev, idx) => {
              let color = 'bg-brand-500';
              if (ev.type === 'billing') color = 'bg-emerald-500';
              if (ev.type === 'maintenance') color = 'bg-amber-500';
              if (ev.type === 'lease') color = 'bg-[#B97843]';

              return (
                <div
                  key={idx}
                  title={`${ev.title}: ${ev.description}`}
                  className={`w-2 h-2 rounded-full ${color} ring-1 ring-white/50 dark:ring-black/50 shadow-xs`}
                />
              );
            })}
            {dayEvents.length > 3 && (
              <span className="text-[8px] font-bold text-[#78685D] dark:text-[#C5B5A5]">
                +{dayEvents.length - 3}
              </span>
            )}
          </div>
        </button>
      );
    }

    return cells;
  };

  return (
    <div className="space-y-4">
      {/* Quick Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 glass-panel p-3 rounded-2xl border border-[#D9CBBB] dark:border-[#38251F]">
        <div className="flex items-center gap-1.5 flex-wrap text-xs">
          <span className="text-[11px] font-bold text-[#78685D] dark:text-[#C5B5A5] flex items-center gap-1 mr-1">
            <Filter className="w-3.5 h-3.5" /> Category:
          </span>
          <button
            type="button"
            onClick={() => setFilterType('all')}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-colors cursor-pointer ${
              filterType === 'all'
                ? 'bg-[#38251F] text-[#FAF7F1] dark:bg-[#FAF7F1] dark:text-[#38251F]'
                : 'bg-[#E9DFD0]/60 dark:bg-[#2A1D18]/60 text-[#78685D] hover:bg-[#E9DFD0]'
            }`}
          >
            All ({monthEvents.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('billing')}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 ${
              filterType === 'billing'
                ? 'bg-emerald-600 text-white'
                : 'bg-[#E9DFD0]/60 dark:bg-[#2A1D18]/60 text-[#78685D] hover:bg-[#E9DFD0]'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
            Rent Invoices ({monthEvents.filter(e => e.type === 'billing').length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('maintenance')}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 ${
              filterType === 'maintenance'
                ? 'bg-amber-600 text-white'
                : 'bg-[#E9DFD0]/60 dark:bg-[#2A1D18]/60 text-[#78685D] hover:bg-[#E9DFD0]'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-500 inline-block"></span>
            Maintenance ({monthEvents.filter(e => e.type === 'maintenance').length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('lease')}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 ${
              filterType === 'lease'
                ? 'bg-[#B97843] text-white'
                : 'bg-[#E9DFD0]/60 dark:bg-[#2A1D18]/60 text-[#78685D] hover:bg-[#E9DFD0]'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-[#B97843] inline-block"></span>
            Lease Expiries ({monthEvents.filter(e => e.type === 'lease').length})
          </button>
        </div>

        <button
          type="button"
          onClick={goToToday}
          className="px-3 py-1 text-xs font-bold rounded-full bg-[#E9DFD0] dark:bg-[#352520] text-[#38251F] dark:text-[#FAF7F1] hover:bg-brand-500/20 border border-[#D9CBBB] dark:border-[#38251F] transition-colors cursor-pointer"
        >
          Jump to Today
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar Grid Section */}
        <div className="lg:col-span-2 glass-panel rounded-3xl p-5 border border-[#D9CBBB] dark:border-[#38251F] shadow-sm">
          {/* Header Month / Navigation */}
          <div className="flex justify-between items-center mb-4">
            <div>
              <h4 className="font-black text-[#38251F] dark:text-[#FAF7F1] Outfit text-lg">
                {monthNames[month]} {year}
              </h4>
              <p className="text-[11px] text-[#78685D] dark:text-[#C5B5A5]">
                {selectedDay ? (
                  <span>
                    Selected:{' '}
                    <strong className="text-brand-600 dark:text-brand-300">
                      {monthNames[month]} {selectedDay}, {year}
                    </strong>{' '}
                    <button
                      type="button"
                      onClick={() => setSelectedDay(null)}
                      className="ml-1 underline text-xs cursor-pointer text-[#78685D]"
                    >
                      (Clear selection)
                    </button>
                  </span>
                ) : (
                  'Click on any day to inspect scheduled events'
                )}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={prevMonth}
                aria-label="Previous Month"
                className="p-2 rounded-xl bg-[#E9DFD0]/80 dark:bg-[#2A1D18]/80 hover:bg-[#E9DFD0] text-[#38251F] dark:text-[#FAF7F1] border border-[#D9CBBB] dark:border-[#38251F] transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={nextMonth}
                aria-label="Next Month"
                className="p-2 rounded-xl bg-[#E9DFD0]/80 dark:bg-[#2A1D18]/80 hover:bg-[#E9DFD0] text-[#38251F] dark:text-[#FAF7F1] border border-[#D9CBBB] dark:border-[#38251F] transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Days of Week Header */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1 text-[10px] uppercase font-bold text-[#78685D] dark:text-[#C5B5A5] tracking-wider py-1 border-b border-[#D9CBBB]/40 dark:border-[#38251F]/40">
            <div>Sun</div>
            <div>Mon</div>
            <div>Tue</div>
            <div>Wed</div>
            <div>Thu</div>
            <div>Fri</div>
            <div>Sat</div>
          </div>

          {/* Calendar Days Grid */}
          <div className="grid grid-cols-7 gap-1 bg-[#FAF7F1]/50 dark:bg-[#1E1715]/50 rounded-2xl overflow-hidden border border-[#D9CBBB]/50 dark:border-[#38251F]/50">
            {renderDays()}
          </div>

          {/* Legend */}
          <div className="flex items-center flex-wrap gap-4 mt-4 pt-3 border-t border-[#D9CBBB]/40 dark:border-[#38251F]/40 text-[11px] text-[#78685D] dark:text-[#C5B5A5]">
            <span className="font-bold uppercase text-[9px] tracking-wider text-[#38251F] dark:text-[#FAF7F1]">Legend:</span>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>Pending Rent Invoices</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              <span>Maintenance & Repairs</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#B97843]"></span>
              <span>Lease Agreement Expiry</span>
            </div>
          </div>
        </div>

        {/* Schedules Drawer Sidebar */}
        <div className="glass-panel rounded-3xl p-5 border border-[#D9CBBB] dark:border-[#38251F] flex flex-col shadow-sm">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#D9CBBB]/50 dark:border-[#38251F]/50">
            <div>
              <h4 className="font-black text-[#38251F] dark:text-[#FAF7F1] Outfit text-sm">
                {selectedDay
                  ? `Schedules: ${monthNames[month]} ${selectedDay}`
                  : `All Schedules: ${monthNames[month]}`}
              </h4>
              <p className="text-[10px] text-[#78685D] dark:text-[#C5B5A5]">
                {displayedEvents.length} {displayedEvents.length === 1 ? 'item' : 'items'} found
              </p>
            </div>
            {selectedDay && (
              <button
                type="button"
                onClick={() => setSelectedDay(null)}
                className="p-1 text-xs text-[#78685D] hover:text-[#38251F] dark:hover:text-[#FAF7F1] rounded-lg hover:bg-[#E9DFD0]/60 transition-colors cursor-pointer"
                title="Clear selected day filter"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[420px]">
            {displayedEvents.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-xs text-[#78685D] py-14">
                <CalendarDays className="w-8 h-8 opacity-30 mb-2" />
                <p className="font-semibold">No scheduled tasks for this selection.</p>
                <p className="text-[10px] text-[#78685D]/80 mt-1 max-w-[200px]">
                  {selectedDay
                    ? 'No events match this specific date. Click another day or clear the filter.'
                    : 'Everything is up to date for this period!'}
                </p>
              </div>
            ) : (
              displayedEvents.map((ev, idx) => {
                let Icon = Calendar;
                let border = 'border-[#D9CBBB] dark:border-[#38251F]';
                let badge = 'bg-brand-500/10 text-brand-700 dark:text-brand-300 border-brand-500/20';

                if (ev.type === 'billing') {
                  Icon = CreditCard;
                  border = 'border-emerald-500/30';
                  badge = 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border-emerald-500/20';
                }
                if (ev.type === 'maintenance') {
                  Icon = Hammer;
                  border = 'border-amber-500/30';
                  badge = 'bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/20';
                }
                if (ev.type === 'lease') {
                  Icon = Key;
                  border = 'border-[#B97843]/30';
                  badge = 'bg-[#B97843]/15 text-[#8F4E1E] dark:text-[#DFB28F] border-[#B97843]/30';
                }

                return (
                  <div
                    key={idx}
                    className={`p-3.5 rounded-2xl bg-[#FAF7F1]/80 dark:bg-[#1E1715]/80 border ${border} flex gap-3 items-start shadow-xs hover:border-brand-500/50 transition-all`}
                  >
                    <div className={`p-2.5 rounded-xl border ${badge} shrink-0 mt-0.5`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-[10px] font-bold text-[#78685D] font-mono block">
                          {new Date(ev.date).toLocaleDateString(undefined, {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </span>
                        <span className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded border ${badge}`}>
                          {ev.type}
                        </span>
                      </div>
                      <h5 className="font-bold text-xs text-[#38251F] dark:text-[#FAF7F1] leading-snug">
                        {ev.title}
                      </h5>
                      <p className="text-[11px] text-[#78685D] dark:text-[#C5B5A5] mt-1 leading-relaxed">
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
    </div>
  );
};

export default CalendarWidget;
