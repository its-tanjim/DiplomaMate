import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useLanguage } from '../../context/LanguageContext';
import { apiFetch } from '../../services/apiClient';
import { ArrowLeft, Trash2, CheckCircle2, AlertTriangle } from 'lucide-react';

// Public account-deletion request page (/delete-account).
// No sign-in required: the user proves identity with board roll + PIN.
// Calls POST /api/account/deletion-request (server worker owns the endpoint).

const BANGLA_DIGIT_MAP: Record<string, string> = {
  '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
  '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9'
};

const normalizeDigits = (val: string): string =>
  String(val || '')
    .trim()
    .replace(/[০-৯]/g, ch => BANGLA_DIGIT_MAP[ch] ?? ch)
    .replace(/[\s\-_]+/g, '');

const STR = {
  en: {
    back: 'Back to sign in',
    title: 'Delete my account',
    intro: 'Use this page to ask for your DiplomaMate account to be deleted — no sign-in needed. We will check your board roll and PIN, then queue your request for the admin.',
    deletedTitle: 'What is deleted',
    deleted: 'Your personal data is hard-erased: your name, board roll, registration number, phone number, email address, PIN hash and profile.',
    retainedTitle: 'What is kept',
    retained: 'Only anonymised academic records are kept — for example attendance or result records with all personal details removed. Nothing that can identify you is kept.',
    note: 'Deletion is permanent. Once your account is deleted you cannot sign in with it again, and your saved marks, notes and community messages are gone.',
    roll: 'Board Roll',
    rollPlaceholder: 'e.g. 843906',
    pin: 'PIN (4–6 digits)',
    pinPlaceholder: 'Your account PIN',
    reason: 'Reason (optional)',
    reasonPlaceholder: 'Why are you deleting your account?',
    submit: 'Request account deletion',
    submitting: 'Sending request…',
    errRollPin: 'Enter your board roll and PIN.',
    errRollInvalid: 'Board roll must be 4–8 digits.',
    errPinInvalid: 'PIN must be 4–6 digits.',
    errFailed: 'Could not send the deletion request. Please try again.',
    queuedTitle: 'Deletion request received',
    queued: 'Your account deletion request has been queued. An admin will process it and your personal data will be hard-erased. Only anonymised academic records will be kept.',
    queuedHint: 'You can close this page now. If you change your mind before the admin processes it, sign in and contact the admin.'
  },
  bn: {
    back: 'সাইন ইনে ফিরে যান',
    title: 'আমার অ্যাকাউন্ট মুছে ফেলুন',
    intro: 'সাইন ইন ছাড়াই আপনার DiplomaMate অ্যাকাউন্ট মুছে ফেলার অনুরোধ করতে এই পাতাটি ব্যবহার করুন। আমরা আপনার বোর্ড রোল ও PIN যাচাই করব, তারপর আপনার অনুরোধ অ্যাডমিনের কাছে সারিতে পাঠাব।',
    deletedTitle: 'যা মুছে ফেলা হয়',
    deleted: 'আপনার ব্যক্তিগত ডেটা পুরোপুরি মুছে ফেলা হয়: আপনার নাম, বোর্ড রোল, রেজিস্ট্রেশন নম্বর, ফোন নম্বর, ইমেইল ঠিকানা, PIN হ্যাশ এবং প্রোফাইল।',
    retainedTitle: 'যা রাখা হয়',
    retained: 'শুধু নামবিহীন (anonymised) একাডেমিক রেকর্ড রাখা হয় — যেমন ব্যক্তিগত তথ্য সরানো উপস্থিতি বা রেজাল্টের রেকর্ড। আপনাকে শনাক্ত করা যায় এমন কিছুই রাখা হয় না।',
    note: 'মুছে ফেলা স্থায়ী। অ্যাকাউন্ট মুছে ফেলার পর আপনি আর তা দিয়ে সাইন ইন করতে পারবেন না, এবং আপনার সংরক্ষিত নম্বর, নোট ও কমিউনিটি মেসেজ চলে যাবে।',
    roll: 'বোর্ড রোল',
    rollPlaceholder: 'যেমন 843906',
    pin: 'PIN (৪–৬ সংখ্যা)',
    pinPlaceholder: 'আপনার অ্যাকাউন্টের PIN',
    reason: 'কারণ (ঐচ্ছিক)',
    reasonPlaceholder: 'কেন অ্যাকাউন্ট মুছতে চান?',
    submit: 'অ্যাকাউন্ট মুছে ফেলার অনুরোধ করুন',
    submitting: 'অনুরোধ পাঠানো হচ্ছে…',
    errRollPin: 'আপনার বোর্ড রোল ও PIN দিন।',
    errRollInvalid: 'বোর্ড রোল ৪–৮ সংখ্যার হতে হবে।',
    errPinInvalid: 'PIN ৪–৬ সংখ্যার হতে হবে।',
    errFailed: 'মুছে ফেলার অনুরোধ পাঠানো যায়নি। আবার চেষ্টা করুন।',
    queuedTitle: 'মুছে ফেলার অনুরোধ পাওয়া গেছে',
    queued: 'আপনার অ্যাকাউন্ট মুছে ফেলার অনুরোধ সারিতে গেছে। একজন অ্যাডমিন এটি প্রক্রিয়া করবেন এবং আপনার ব্যক্তিগত ডেটা পুরোপুরি মুছে ফেলা হবে। শুধু নামবিহীন একাডেমিক রেকর্ড রাখা হবে।',
    queuedHint: 'এখন এই পাতাটি বন্ধ করতে পারেন। অ্যাডমিন প্রক্রিয়া করার আগে মন বদলালে সাইন ইন করে অ্যাডমিনের সঙ্গে যোগাযোগ করুন।'
  }
} as const;

export const DeleteAccountScreen: React.FC = () => {
  const { isLoggedIn, setActiveScreen } = useApp();
  const { lang } = useLanguage();
  const L = lang === 'bn' ? STR.bn : STR.en;
  const [boardRoll, setBoardRoll] = useState('');
  const [pin, setPin] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [queued, setQueued] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const cleanRoll = normalizeDigits(boardRoll);
    const cleanPin = normalizeDigits(pin);
    if (!cleanRoll || !cleanPin) {
      setError(L.errRollPin);
      return;
    }
    if (!/^\d{4,8}$/.test(cleanRoll)) {
      setError(L.errRollInvalid);
      return;
    }
    if (!/^\d{4,6}$/.test(cleanPin)) {
      setError(L.errPinInvalid);
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await apiFetch('/api/account/deletion-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ boardRoll: cleanRoll, pin: cleanPin, reason: reason.trim() || undefined })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        setError(data.error || L.errFailed);
        return;
      }
      setQueued(true);
    } catch {
      setError(L.errFailed);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-app-bg flex flex-col py-8 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <button
          type="button"
          onClick={() => setActiveScreen(isLoggedIn ? 'home' : 'welcome')}
          className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-text-primary cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{L.back}</span>
        </button>

        <div className="dm-card p-5 sm:p-6 space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-text-primary">{L.title}</h1>
            </div>
          </div>

          {queued ? (
            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-teal-50 border border-teal-200 text-teal-900 flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 shrink-0 text-teal-600" />
                <div>
                  <p className="text-xs font-bold">{L.queuedTitle}</p>
                  <p className="text-[11px] leading-relaxed mt-1">{L.queued}</p>
                </div>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">{L.queuedHint}</p>
            </div>
          ) : (
            <>
              <p className="text-xs leading-relaxed text-slate-700">{L.intro}</p>

              <div className="space-y-2 text-xs leading-relaxed">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <p className="font-bold text-text-primary">{L.deletedTitle}</p>
                  <p className="text-slate-600 mt-0.5">{L.deleted}</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <p className="font-bold text-text-primary">{L.retainedTitle}</p>
                  <p className="text-slate-600 mt-0.5">{L.retained}</p>
                </div>
                <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-2.5 flex items-start gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" />
                  <span>{L.note}</span>
                </p>
              </div>

              {error && (
                <div role="alert" className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-text-primary mb-1">{L.roll}</label>
                  <input
                    type="text"
                    required
                    inputMode="numeric"
                    placeholder={L.rollPlaceholder}
                    value={boardRoll}
                    onChange={(e) => setBoardRoll(e.target.value)}
                    className="dm-field w-full px-3 py-2.5 text-sm text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-primary mb-1">{L.pin}</label>
                  <input
                    type="password"
                    required
                    maxLength={6}
                    inputMode="numeric"
                    placeholder={L.pinPlaceholder}
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    className="dm-field w-full px-3 py-2.5 text-sm text-slate-800 tracking-widest font-mono text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-primary mb-1">{L.reason}</label>
                  <input
                    type="text"
                    placeholder={L.reasonPlaceholder}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="dm-field w-full px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold shadow-sm flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-60"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{isSubmitting ? L.submitting : L.submit}</span>
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
