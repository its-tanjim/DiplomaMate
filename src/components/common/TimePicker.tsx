import React, { useState, useEffect } from 'react';
import { Clock, ChevronDown } from 'lucide-react';

interface TimePickerProps {
  value: string; // e.g. "08:00 AM" or "01:30 PM"
  onChange: (time: string) => void;
  label?: string;
  disabled?: boolean;
  className?: string;
  required?: boolean;
}

export const TimePicker: React.FC<TimePickerProps> = ({
  value,
  onChange,
  label,
  disabled = false,
  className = '',
  required = false
}) => {
  // Parse initial 12-hour time
  const parseTime = (timeStr: string): { hour: string; minute: string; meridiem: 'AM' | 'PM' } => {
    if (!timeStr) return { hour: '08', minute: '00', meridiem: 'AM' };
    const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
    if (!match) return { hour: '08', minute: '00', meridiem: 'AM' };
    
    let h = parseInt(match[1], 10);
    if (h < 1) h = 1;
    if (h > 12) h = 12;
    const hour = h < 10 ? `0${h}` : `${h}`;
    
    let m = parseInt(match[2], 10);
    if (m < 0) m = 0;
    if (m > 59) m = 59;
    const minute = m < 10 ? `0${m}` : `${m}`;
    
    const meridiem: 'AM' | 'PM' = (match[3]?.toUpperCase() === 'PM') ? 'PM' : 'AM';
    return { hour, minute, meridiem };
  };

  const parsed = parseTime(value);
  const [hour, setHour] = useState(parsed.hour);
  const [minute, setMinute] = useState(parsed.minute);
  const [meridiem, setMeridiem] = useState<'AM' | 'PM'>(parsed.meridiem);

  useEffect(() => {
    const p = parseTime(value);
    setHour(p.hour);
    setMinute(p.minute);
    setMeridiem(p.meridiem);
  }, [value]);

  const updateTime = (newH: string, newM: string, newMed: 'AM' | 'PM') => {
    setHour(newH);
    setMinute(newM);
    setMeridiem(newMed);
    onChange(`${newH}:${newM} ${newMed}`);
  };

  // Hours: 01 to 12
  const hoursList = Array.from({ length: 12 }, (_, i) => {
    const n = i + 1;
    return n < 10 ? `0${n}` : `${n}`;
  });

  // Minutes: 00 to 55 in 5m steps, plus custom
  const minutesList = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];

  // Quick period presets common in Bangladesh Polytechnic routines
  const morningPresets = ['08:00 AM', '08:45 AM', '09:30 AM', '10:15 AM', '11:00 AM', '11:45 AM', '12:30 PM', '01:15 PM'];
  const dayPresets = ['01:30 PM', '02:15 PM', '03:00 PM', '03:45 PM', '04:30 PM', '05:15 PM', '06:00 PM', '06:45 PM'];

  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label className="block text-xs font-semibold text-text-primary flex items-center justify-between">
          <span>{label} {required && <span className="text-rose-500">*</span>}</span>
          <span className="font-mono text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded text-[11px] font-bold">
            {hour}:{minute} {meridiem}
          </span>
        </label>
      )}

      <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl p-1.5 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-all">
        <Clock aria-hidden="true" className="w-4 h-4 text-slate-400 shrink-0 ml-1" />

        {/* Hour Select */}
        <div className="relative flex-1">
          <select
            value={hour}
            disabled={disabled}
            onChange={(e) => updateTime(e.target.value, minute, meridiem)}
            className="w-full bg-surface border border-slate-200/90 rounded-lg py-1 px-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue cursor-pointer appearance-none text-center"
            title="Select Hour"
          >
            {hoursList.map(h => (
              <option key={h} value={h}>{h}</option>
            ))}
          </select>
          <span className="text-[10px] text-slate-400 block text-center leading-tight mt-0.5">Hr</span>
        </div>

        <span className="font-bold text-slate-400 pb-3">:</span>

        {/* Minute Select */}
        <div className="relative flex-1">
          <select
            value={minute}
            disabled={disabled}
            onChange={(e) => updateTime(hour, e.target.value, meridiem)}
            className="w-full bg-surface border border-slate-200/90 rounded-lg py-1 px-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue cursor-pointer appearance-none text-center"
            title="Select Minute"
          >
            {minutesList.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <span className="text-[10px] text-slate-400 block text-center leading-tight mt-0.5">Min</span>
        </div>

        {/* AM / PM Toggle */}
        <div className="flex rounded-lg bg-slate-200/80 p-0.5 shrink-0 self-start">
          <button
            type="button"
            disabled={disabled}
            onClick={() => updateTime(hour, minute, 'AM')}
            className={`px-2 py-1 text-xs font-bold rounded-md transition-colors ${
              meridiem === 'AM' 
                ? 'bg-blue-600 text-white shadow-xs' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            AM
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => updateTime(hour, minute, 'PM')}
            className={`px-2 py-1 text-xs font-bold rounded-md transition-colors ${
              meridiem === 'PM' 
                ? 'bg-blue-600 text-white shadow-xs' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            PM
          </button>
        </div>
      </div>

      {/* Quick Period Presets */}
      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pt-1">
        <span className="text-[10px] text-slate-400 shrink-0 font-medium mr-0.5">Presets:</span>
        {(meridiem === 'AM' ? morningPresets : dayPresets).slice(0, 4).map((preset) => (
          <button
            key={preset}
            type="button"
            disabled={disabled}
            onClick={() => {
              const p = parseTime(preset);
              updateTime(p.hour, p.minute, p.meridiem);
            }}
            className="text-[10px] bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200 whitespace-nowrap transition-colors"
          >
            {preset}
          </button>
        ))}
      </div>
    </div>
  );
};
