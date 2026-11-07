import React from 'react';
import { Bell, Clock } from 'lucide-react';

interface ReminderLeadTimeSliderProps {
  value: number; // 1 to 60 minutes
  onChange: (minutes: number) => void;
  label?: string;
  helperText?: string;
  disabled?: boolean;
}

export const ReminderLeadTimeSlider: React.FC<ReminderLeadTimeSliderProps> = ({
  value,
  onChange,
  label = 'Reminder Lead Time',
  helperText = 'How many minutes before each class period or deadline to trigger notification alerts',
  disabled = false
}) => {
  const presets = [5, 10, 15, 30, 45, 60];

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
            <Bell className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-bold text-text-primary block">{label}</span>
            <span className="text-[11px] text-slate-500">{helperText}</span>
          </div>
        </div>

        {/* Live Badge */}
        <span className="inline-flex items-center gap-1 bg-blue-600 text-white font-mono font-bold text-xs px-2.5 py-1 rounded-full shadow-xs">
          <Clock className="w-3 h-3" />
          <span>{value} min{value > 1 ? 's' : ''} prior</span>
        </span>
      </div>

      {/* Slider Input */}
      <div className="pt-1">
        <input
          type="range"
          min={1}
          max={60}
          step={1}
          disabled={disabled}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600 focus:outline-none"
        />
        <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-1">
          <span>1 min</span>
          <span>15 min</span>
          <span>30 min</span>
          <span>45 min</span>
          <span>60 min</span>
        </div>
      </div>

      {/* Quick Preset Buttons */}
      <div className="flex items-center gap-1.5 pt-1 flex-wrap">
        <span className="text-[10px] text-slate-500 font-medium">Quick Pick:</span>
        {presets.map((mins) => (
          <button
            key={mins}
            type="button"
            disabled={disabled}
            onClick={() => onChange(mins)}
            className={`text-[11px] px-2.5 py-1 rounded-lg border font-semibold transition-all ${
              value === mins
                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                : 'bg-surface text-slate-700 border-slate-200 hover:border-blue-300 hover:bg-blue-50/50'
            }`}
          >
            {mins}m
          </button>
        ))}
      </div>
    </div>
  );
};
