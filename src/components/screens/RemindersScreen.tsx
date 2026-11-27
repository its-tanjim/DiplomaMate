import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Bell, 
  Plus, 
  CheckCircle2, 
  Circle, 
  Calendar, 
  Clock, 
  AlertCircle, 
  Trash2,
  BookmarkCheck,
  Sparkles
} from 'lucide-react';
import { ReminderItem } from '../../types';
import { TimePicker } from '../common/TimePicker';
import { ReminderLeadTimeSlider } from '../common/ReminderLeadTimeSlider';
import { Modal } from '../common/Modal';

export const RemindersScreen: React.FC = () => {
  const { 
    reminders, 
    addReminder, 
    toggleReminder, 
    deleteReminder,
    notifications,
    updateNotifications
  } = useApp();

  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [showAddModal, setShowAddModal] = useState(false);

  // Form state
  const [newReminder, setNewReminder] = useState<Omit<ReminderItem, 'id' | 'isCompleted'>>({
    title: '',
    category: 'Exam',
    dueDate: new Date().toISOString().split('T')[0],
    dueTime: '09:00 AM',
    priority: 'High',
    note: ''
  });

  const categories = ['All', 'Exam', 'Assignment', 'Lab Report', 'BTEB Notice', 'Personal'];

  const filteredReminders = reminders.filter(r => {
    if (categoryFilter === 'All') return true;
    return r.category === categoryFilter;
  });

  const activeCount = reminders.filter(r => !r.isCompleted).length;
  const completedCount = reminders.filter(r => r.isCompleted).length;

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReminder.title.trim()) return;

    const res = await addReminder(newReminder);
    if (!res.success) return; // modal stays open with the error toast
    setNewReminder({
      title: '',
      category: 'Exam',
      dueDate: new Date().toISOString().split('T')[0],
      dueTime: '09:00 AM',
      priority: 'High',
      note: ''
    });
    setShowAddModal(false);
  };

  return (
    <div className="space-y-4 pb-8">
      {/* Top Header Card */}
      <div className="bg-surface rounded-2xl border border-slate-200 p-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Bell aria-hidden="true" className="w-4 h-4" />
              </div>
              <h1 className="text-lg font-bold text-text-primary">
                Academic Reminders
              </h1>
            </div>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="bg-brand-blue hover:bg-blue-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-xs transition-colors self-start sm:self-auto cursor-pointer"
          >
            <Plus aria-hidden="true" className="w-3.5 h-3.5" />
            <span>New Reminder</span>
          </button>
        </div>

        {/* Categories Bar */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar pt-3 border-t border-slate-100 mt-3 pb-0.5">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                categoryFilter === cat
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/60'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Reusable Reminder Lead Time Slider */}
      <ReminderLeadTimeSlider
        value={notifications.routineLeadMinutes}
        onChange={(mins) => updateNotifications({ routineLeadMinutes: mins })}
        label="Notification Alert Lead Time"
        helperText=""
      />

      {/* Stats Summary Strip */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-surface rounded-xl border border-slate-200 p-3 shadow-xs flex items-center justify-between">
          <span className="text-slate-600 font-medium">Pending Tasks</span>
          <span className="font-bold text-amber-600 font-mono text-sm">{activeCount}</span>
        </div>
        <div className="bg-surface rounded-xl border border-slate-200 p-3 shadow-xs flex items-center justify-between">
          <span className="text-slate-600 font-medium">Completed</span>
          <span className="font-bold text-green-600 font-mono text-sm">{completedCount}</span>
        </div>
      </div>

      {/* Reminders List */}
      <div className="space-y-2.5">
        {filteredReminders.length === 0 ? (
          <div className="bg-surface rounded-2xl border border-slate-200 p-8 text-center shadow-xs">
            <BookmarkCheck aria-hidden="true" className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-text-primary">No reminders yet</h3>
            <p className="text-xs text-slate-500 mt-1">Add a new reminder to stay on track with your diploma studies.</p>
          </div>
        ) : (
          filteredReminders.map((rem) => {
            const isCompleted = rem.isCompleted;
            return (
              <div
                key={rem.id}
                className={`bg-surface rounded-2xl border transition-all p-3.5 shadow-xs ${
                  isCompleted 
                    ? 'border-slate-200/60 opacity-60 bg-slate-50/50' 
                    : rem.priority === 'High' 
                      ? 'border-rose-200/80 hover:border-rose-300' 
                      : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Toggle Button */}
                  <button
                    onClick={() => void toggleReminder(rem.id)}
                    className="mt-0.5 text-slate-400 hover:text-green-600 transition-colors p-0.5 cursor-pointer"
                    title={isCompleted ? 'Mark Pending' : 'Mark Completed'}
                  >
                    {isCompleted ? (
                      <CheckCircle2 aria-hidden="true" className="w-5 h-5 text-green-600" />
                    ) : (
                      <Circle aria-hidden="true" className="w-5 h-5 text-slate-300 hover:text-slate-400" />
                    )}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[10px] font-semibold tracking-wider text-slate-500 uppercase">
                        {rem.category}
                      </span>
                      <span className="text-slate-300">·</span>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.2 rounded ${
                        rem.priority === 'High' 
                          ? 'bg-rose-50 text-rose-700' 
                          : rem.priority === 'Medium' 
                            ? 'bg-amber-50 text-amber-700' 
                            : 'bg-slate-100 text-slate-600'
                      }`}>
                        {rem.priority} Priority
                      </span>
                    </div>

                    <h3 className={`text-sm font-bold ${
                      isCompleted ? 'line-through text-slate-400' : 'text-text-primary'
                    }`}>
                      {rem.title}
                    </h3>

                    {rem.note && (
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                        {rem.note}
                      </p>
                    )}

                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-2">
                      <span className="flex items-center gap-1 font-medium">
                        <Calendar aria-hidden="true" className="w-3.5 h-3.5 text-slate-400" />
                        {rem.dueDate}
                      </span>
                      <span className="flex items-center gap-1 font-medium">
                        <Clock aria-hidden="true" className="w-3.5 h-3.5 text-slate-400" />
                        {rem.dueTime}
                      </span>
                    </div>
                  </div>

                  {/* Delete Button */}
                  <button
                    onClick={() => void deleteReminder(rem.id)}
                    className="text-slate-300 hover:text-rose-600 p-1 rounded-md transition-colors"
                    aria-label="Delete Reminder"
                    title="Delete Reminder"
                  >
                    <Trash2 aria-hidden="true" className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Reminder Modal */}
      {showAddModal && (
        <Modal
          onClose={() => setShowAddModal(false)}
          labelledBy="reminders-add-title"
          panelClassName="bg-surface rounded-2xl max-w-md w-full p-5 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150"
          overlayClassName="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
          showCloseButton={false}
        >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Bell aria-hidden="true" className="w-4 h-4" />
                </div>
                <h3 id="reminders-add-title" className="font-bold text-text-primary text-base">Schedule Reminder</h3>
              </div>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
               aria-label="Close">
                ✕
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-3 mt-3">
              <div>
                <label className="block text-xs font-semibold text-text-primary mb-1">
                  Reminder Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Microprocessor Midterm Exam"
                  value={newReminder.title}
                  onChange={(e) => setNewReminder({ ...newReminder, title: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-blue"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-text-primary mb-1">Category</label>
                  <select
                    value={newReminder.category}
                    onChange={(e) => setNewReminder({ ...newReminder, category: e.target.value as any })}
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-text-primary"
                  >
                    <option value="Exam">Exam / Class Test</option>
                    <option value="Assignment">Assignment Submission</option>
                    <option value="Lab Report">Lab Report & Jobs</option>
                    <option value="BTEB Notice">BTEB Notice / Form</option>
                    <option value="Personal">Personal Study</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-primary mb-1">Priority</label>
                  <select
                    value={newReminder.priority}
                    onChange={(e) => setNewReminder({ ...newReminder, priority: e.target.value as any })}
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-text-primary"
                  >
                    <option value="High">High (Red Alert)</option>
                    <option value="Medium">Medium</option>
                    <option value="Normal">Normal</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-primary mb-1">Target Due Date</label>
                <input
                  type="date"
                  required
                  value={newReminder.dueDate}
                  onChange={(e) => setNewReminder({ ...newReminder, dueDate: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-text-primary mb-2"
                />
              </div>

              <div>
                <TimePicker
                  label="Reminder Due Time"
                  value={newReminder.dueTime}
                  onChange={(t) => setNewReminder({ ...newReminder, dueTime: t })}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-primary mb-1">Additional Notes</label>
                <textarea
                  rows={2}
                  placeholder="Note (optional)"
                  value={newReminder.note || ''}
                  onChange={(e) => setNewReminder({ ...newReminder, note: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-text-primary"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-brand-blue text-white text-xs font-semibold hover:bg-blue-700 shadow-xs"
                >
                  Save Reminder
                </button>
              </div>
            </form>
        </Modal>
      )}
    </div>
  );
};
