import React from 'react';
import { useApp } from '../../context/AppContext';
import { useLanguage } from '../../context/LanguageContext';
import { ArrowLeft, FileText } from 'lucide-react';

// Terms of Service — version 2026-11-26.
// Grounded ONLY in real app behaviour verified in the 2026-11-26 compliance
// audit. Facts the audit could not verify are marked [PLACEHOLDER].

type Section = { h: string; b: string[] };

const EN: { title: string; updated: string; intro: string[]; sections: Section[] } = {
  title: 'Terms of Service',
  updated: 'Last updated: 26 November 2026 · Version 2026-11-26',
  intro: [
    'These Terms of Service govern your use of DiplomaMate, an app for BTEB Diploma in Engineering students, teachers, class captains and administrators. By creating an account or using the app, you agree to these terms and to the Privacy Policy.',
    'Operator: [PLACEHOLDER — legal name of the person or organisation that operates DiplomaMate]. Support / contact: its.tanjim.06@gmail.com.'
  ],
  sections: [
    {
      h: '1. Acceptance and eligibility',
      b: [
        'Using DiplomaMate means you accept these terms. If you do not agree, do not create an account or use the app.',
        'DiplomaMate is for real BTEB diploma students and teachers of polytechnic institutes, with a real board roll (students) or real faculty credentials (teachers).',
        'One board roll = one account. You may not create more than one student account for the same board roll.'
      ]
    },
    {
      h: '2. Accounts and PIN',
      b: [
        'You sign in with your board roll and a 4–6 digit PIN (teachers: phone number or email and PIN). You choose your PIN when you register, and you must keep your roll and PIN secret.',
        'You are responsible for everything done on your account. If you think someone else knows your PIN, change it as soon as you can and tell the admin.',
        'Admin sign-in is protected by lockouts: 5 failed admin password attempts lock the account for 15 minutes, and 3 wrong admin PINs lock the admin panel for 5 hours.',
        'We may refuse, suspend or delete accounts that break these terms (see section 9).'
      ]
    },
    {
      h: '3. Acceptable use',
      b: [
        'Do not post fake or wrong notes, jobs or results. Notes and jobs must come from trustable sources.',
        'Job posts must carry a real external apply link — the server enforces this.',
        'No harassment, spam or abusive behaviour in communities. Community messages can be reported to moderators and admins, who may remove content and remove members.',
        'Do not try to break into other accounts, bypass cohort restrictions, or interfere with the service.'
      ]
    },
    {
      h: '4. Content you upload',
      b: [
        'You must own, or have the right to share, anything you upload — notes, assignments, files, community images and messages.',
        'By uploading content you give DiplomaMate permission to display it and store it so the app can work (for example, showing your note to students in your cohort, or storing your community file). You keep ownership of your content.',
        'Uploads may be sent to Google’s Gemini API for text extraction, so that notes and routines can be searched and read in the app.',
        'Uploaded images carry no licence check in the app — you are responsible for having the right to share them.',
        'We may remove content that breaks these terms or that is reported and found to break them.'
      ]
    },
    {
      h: '5. Class captain verification',
      b: [
        'A student applies to be a class captain by sending a direct approval request to their semester’s guide teacher and the admin — there is no paper form.',
        'A guide teacher endorses the request with their PIN, and the admin approves, rejects or revokes it.',
        'At most 2 verified captains are allowed per section.',
        'Being a captain is a role inside the app, not an official accreditation from BTEB or your institute.'
      ]
    },
    {
      h: '6. Third-party services',
      b: [
        'BTEB Result Zone (btebresultszone.com) is a third-party site. Results shown from it are not verified by DiplomaMate. The official BTEB portal (result.bteb.gov.bd) is BTEB’s own site; you solve its own security check yourself.',
        'Job listings may link to outside sites (such as Careerjet, Bdjobs or BPSC). Those sites have their own terms and DiplomaMate is not responsible for them.',
        'Google / Facebook sign-in appears only if it is enabled in the app build. In the current live build neither button appears.',
        'Cloudflare Turnstile may check that you are not an automated bot when you sign in or sign up.',
        'Document scanning uses Google’s Gemini API (see Privacy Policy).'
      ]
    },
    {
      h: '7. Payments',
      b: [
        'There are no payments in DiplomaMate. The payment section is OFF permanently: no feature costs money, there is no premium tier, no subscription and no paywall.',
        'Teacher Contacts are free for everyone. If payments are ever introduced, these terms will be updated first and the price will be shown clearly before you pay anything.'
      ]
    },
    {
      h: '8. Availability and data loss',
      b: [
        'DiplomaMate is provided as a free service with no uptime guarantee. The server runs on Render’s free tier, which sleeps after a period with no visitors — the first load after sleeping can take 30–60 seconds while the server wakes up.',
        'Sessions are stored in the server’s memory, so a server restart or deploy signs everyone out and you will need to sign in again.',
        'Your account data is kept while your account exists. If you delete your account, your personal data is hard-erased and only anonymised academic records are kept (see Privacy Policy, section 5).'
      ]
    },
    {
      h: '9. Suspension and termination',
      b: [
        'An admin may approve, reject, revoke or deactivate accounts, including accounts that break these terms or that were created with false information.',
        'Deactivation stops you signing in, but it is not the same as deletion — the account record is kept. Full erasure happens only through a deletion request (Settings → “Delete my account”, or the public /delete-account page).',
        'If your account is suspended and you think it is a mistake, contact the support contact above. [PLACEHOLDER — appeal process to be confirmed by the operator.]',
        'You can end your use of DiplomaMate at any time by signing out, and you can delete your account as described in the Privacy Policy.'
      ]
    },
    {
      h: '10. Liability and disclaimer',
      b: [
        'Results, notes, jobs and notices in the app are provided as-is. Verify deadlines and details on the original source before you apply for anything or rely on a result.',
        'The signed paper gazette and the official transcript issued by BTEB and your polytechnic registrar remain the official legal authority for your results — not the app.',
        'DiplomaMate is not responsible for the content of third-party sites, for wrong information posted by other users, or for any loss caused by using the app, to the extent the law allows.'
      ]
    },
    {
      h: '11. Governing law',
      b: [
        'These terms are governed by the laws of Bangladesh. Any dispute about DiplomaMate will be handled under Bangladeshi law.'
      ]
    },
    {
      h: '12. Changes to these terms',
      b: [
        'If these terms change in an important way, we will show the new version in the app. Continuing to use DiplomaMate after a change means you accept the new terms.'
      ]
    },
    {
      h: '13. Contact',
      b: [
        'Operator: [PLACEHOLDER — legal name].',
        'Support contact: its.tanjim.06@gmail.com.',
        'Privacy questions: see the Privacy Policy, or contact its.tanjim.06@gmail.com.'
      ]
    }
  ]
};

const BN: typeof EN = {
  title: 'সেবার শর্তাবলি',
  updated: 'সর্বশেষ হালনাগাদ: ২৬ নভেম্বর ২০২৬ · সংস্করণ 2026-11-26',
  intro: [
    'এই সেবার শর্তাবলি DiplomaMate ব্যবহারের নিয়ম নির্ধারণ করে। DiplomaMate BTEB ডিপ্লোমা ইন ইঞ্জিনিয়ারিং শিক্ষার্থী, শিক্ষক, ক্লাস ক্যাপ্টেন এবং অ্যাডমিনদের জন্য একটি অ্যাপ। অ্যাকাউন্ট খুলে বা অ্যাপ ব্যবহার করে আপনি এই শর্তাবলি এবং গোপনীয়তা নীতিতে রাজি হচ্ছেন।',
    'পরিচালক: [PLACEHOLDER — DiplomaMate পরিচালনাকারী ব্যক্তি বা প্রতিষ্ঠানের আইনি নাম]। সহায়তা / যোগাযোগ: its.tanjim.06@gmail.com।'
  ],
  sections: [
    {
      h: '১. গ্রহণযোগ্যতা ও যোগ্যতা',
      b: [
        'DiplomaMate ব্যবহার করলেই আপনি এই শর্তাবলি মেনে নিচ্ছেন। রাজি না হলে অ্যাকাউন্ট খুলবেন না বা অ্যাপ ব্যবহার করবেন না।',
        'DiplomaMate পলিটেকনিক ইনস্টিটিউটের প্রকৃত BTEB ডিপ্লোমা শিক্ষার্থী ও শিক্ষকদের জন্য — শিক্ষার্থীদের আসল বোর্ড রোল, শিক্ষকদের আসল শিক্ষক পরিচয় থাকতে হবে।',
        'এক বোর্ড রোল = এক অ্যাকাউন্ট। একই বোর্ড রোল দিয়ে একাধিক শিক্ষার্থী অ্যাকাউন্ট খোলা যাবে না।'
      ]
    },
    {
      h: '২. অ্যাকাউন্ট ও PIN',
      b: [
        'আপনি বোর্ড রোল ও ৪–৬ সংখ্যার PIN দিয়ে সাইন ইন করেন (শিক্ষক: ফোন নম্বর বা ইমেইল ও PIN)। নিবন্ধনের সময় আপনি PIN বেছে নেন, এবং আপনার রোল ও PIN গোপন রাখা আপনার দায়িত্ব।',
        'আপনার অ্যাকাউন্ট দিয়ে যা করা হয় তার দায় আপনার। অন্য কেউ আপনার PIN জেনে গেছে মনে হলে যত তাড়াতাড়ি সম্ভব PIN বদলে ফেলুন এবং অ্যাডমিনকে জানান।',
        'অ্যাডমিন সাইন-ইনে লকআউট সুরক্ষা আছে: ৫ বার ভুল অ্যাডমিন পাসওয়ার্ড দিলে অ্যাকাউন্ট ১৫ মিনিটের জন্য লক হয়, আর ৩ বার ভুল অ্যাডমিন PIN দিলে অ্যাডমিন প্যানেল ৫ ঘণ্টার জন্য লক হয়।',
        'এই শর্ত ভঙ্গকারী অ্যাকাউন্ট আমরা প্রত্যাখ্যান, স্থগিত বা মুছে ফেলতে পারি (৯ নম্বর ধারা দেখুন)।'
      ]
    },
    {
      h: '৩. গ্রহণযোগ্য ব্যবহার',
      b: [
        'ভুয়া বা ভুল নোট, চাকরি বা রেজাল্ট পোস্ট করবেন না। নোট ও চাকরি বিশ্বস্ত উৎস থেকে আসতে হবে।',
        'চাকরির পোস্টে আসল বাহ্যিক আবেদনের লিংক থাকতে হবে — সার্ভার এটি কার্যকর করে।',
        'কমিউনিটিতে হয়রানি, স্প্যাম বা আপত্তিকর আচরণ করা যাবে না। কমিউনিটি মেসেজ মডারেটর ও অ্যাডমিনের কাছে রিপোর্ট করা যায়; তারা কনটেন্ট সরাতে ও সদস্য বাদ দিতে পারেন।',
        'অন্যের অ্যাকাউন্টে ঢোকার চেষ্টা, কোহর্টের সীমা এড়ানো বা সেবায় ব্যাঘাত ঘটানো যাবে না।'
      ]
    },
    {
      h: '৪. আপনার আপলোড করা কনটেন্ট',
      b: [
        'আপনি যা আপলোড করেন — নোট, অ্যাসাইনমেন্ট, ফাইল, কমিউনিটি ছবি ও মেসেজ — তার মালিকানা বা শেয়ার করার অধিকার আপনার থাকতে হবে।',
        'কনটেন্ট আপলোড করে আপনি DiplomaMate-কে তা দেখানো ও সংরক্ষণ করার অনুমতি দিচ্ছেন, যাতে অ্যাপটি কাজ করতে পারে (যেমন আপনার কোহর্টের শিক্ষার্থীদের কাছে আপনার নোট দেখানো, বা আপনার কমিউনিটি ফাইল সংরক্ষণ করা)। কনটেন্টের মালিকানা আপনারই থাকবে।',
        'আপলোড টেক্সট বের করার জন্য Google-এর Gemini API-তে পাঠানো হতে পারে, যাতে নোট ও রুটিন খোঁজা ও পড়া যায়।',
        'আপলোড করা ছবির লাইসেন্স অ্যাপে যাচাই করা হয় না — শেয়ার করার অধিকার থাকা আপনার দায়িত্ব।',
        'এই শর্ত ভঙ্গকারী বা রিপোর্টের ভিত্তিতে ভঙ্গকারী বলে প্রমাণিত কনটেন্ট আমরা সরিয়ে দিতে পারি।'
      ]
    },
    {
      h: '৫. ক্লাস ক্যাপ্টেন যাচাইকরণ',
      b: [
        'শিক্ষার্থী ক্লাস ক্যাপ্টেন হতে তার সেমিস্টারের গাইড শিক্ষক ও অ্যাডমিনের কাছে সরাসরি অনুমোদনের অনুরোধ পাঠায় — কোনো কাগজের ফরম নেই।',
        'গাইড শিক্ষক তার PIN দিয়ে অনুরোধে অনুমোদন দেন, এবং অ্যাডমিন তা অনুমোদন, প্রত্যাখ্যান বা বাতিল করেন।',
        'প্রতি সেকশনে সর্বোচ্চ ২ জন যাচাইকৃত ক্যাপ্টেন থাকতে পারে।',
        'ক্যাপ্টেন হওয়া অ্যাপের ভেতরের একটি ভূমিকা, BTEB বা আপনার ইনস্টিটিউটের কোনো অফিসিয়াল স্বীকৃতি নয়।'
      ]
    },
    {
      h: '৬. তৃতীয় পক্ষের সেবা',
      b: [
        'BTEB Result Zone (btebresultszone.com) একটি তৃতীয় পক্ষের সাইট। সেখান থেকে দেখানো রেজাল্ট DiplomaMate যাচাই করে না। অফিসিয়াল BTEB পোর্টাল (result.bteb.gov.bd) BTEB-এর নিজস্ব সাইট; এর নিরাপত্তা যাচাই আপনাকেই করতে হবে।',
        'চাকরির তালিকা বাইরের সাইটের (যেমন Careerjet, Bdjobs বা BPSC) লিংক দিতে পারে। ওই সাইটগুলোর নিজস্ব শর্ত আছে এবং DiplomaMate সেগুলোর জন্য দায়ী নয়।',
        'Google / Facebook সাইন-ইন তখনই দেখা যায় যখন অ্যাপের বিল্ডে তা চালু থাকে। বর্তমান লাইভ সংস্করণে কোনো বোতামই দেখা যায় না।',
        'সাইন-ইন বা সাইন-আপের সময় আপনি স্বয়ংক্রিয় বট নন তা যাচাই করতে Cloudflare Turnstile ব্যবহার হতে পারে।',
        'ডকুমেন্ট স্ক্যানে Google-এর Gemini API ব্যবহার হয় (গোপনীয়তা নীতি দেখুন)।'
      ]
    },
    {
      h: '৭. পেমেন্ট',
      b: [
        'DiplomaMate-এ কোনো পেমেন্ট নেই। পেমেন্ট বিভাগ স্থায়ীভাবে বন্ধ: কোনো ফিচারের জন্য টাকা লাগে না, কোনো প্রিমিয়াম স্তর, সাবস্ক্রিপশন বা পেওয়াল নেই।',
        'Teacher Contacts সবার জন্য বিনামূল্যে। পেমেন্ট কখনো চালু হলে প্রথমে এই শর্তাবলি হালনাগাদ করা হবে এবং টাকা দেওয়ার আগে মূল্য স্পষ্টভাবে দেখানো হবে।'
      ]
    },
    {
      h: '৮. প্রাপ্যতা ও ডেটা হারানো',
      b: [
        'DiplomaMate একটি বিনামূল্যের সেবা, আপটাইমের কোনো নিশ্চয়তা নেই। সার্ভার Render-এর বিনামূল্যের স্তরে চলে, যা কিছুক্ষণ দর্শক না থাকলে ঘুমিয়ে যায় — ঘুম থেকে ওঠার পর প্রথম লোডে ৩০–৬০ সেকেন্ড লাগতে পারে।',
        'সেশন সার্ভারের মেমোরিতে থাকে, তাই সার্ভার রিস্টার্ট বা ডিপ্লয় হলে সবাই সাইন আউট হয়ে যান এবং আবার সাইন ইন করতে হয়।',
        'আপনার অ্যাকাউন্ট থাকা পর্যন্ত আপনার অ্যাকাউন্টের ডেটা রাখা হয়। অ্যাকাউন্ট মুছে ফেললে আপনার ব্যক্তিগত ডেটা পুরোপুরি মুছে ফেলা হয় এবং শুধু নামবিহীন একাডেমিক রেকর্ড রাখা হয় (গোপনীয়তা নীতির ৫ নম্বর ধারা দেখুন)।'
      ]
    },
    {
      h: '৯. স্থগিতকরণ ও সমাপ্তি',
      b: [
        'অ্যাডমিন অ্যাকাউন্ট অনুমোদন, প্রত্যাখ্যান, বাতিল বা নিষ্ক্রিয় করতে পারেন — যেমন এই শর্ত ভঙ্গকারী বা ভুয়া তথ্য দিয়ে তৈরি অ্যাকাউন্ট।',
        'নিষ্ক্রিয় করলে আপনি আর সাইন ইন করতে পারবেন না, তবে এটি মুছে ফেলার সমান নয় — অ্যাকাউন্টের রেকর্ড থেকে যায়। পুরো মুছে ফেলা শুধু মুছে ফেলার অনুরোধের মাধ্যমে হয় (Settings → “Delete my account”, অথবা পাবলিক /delete-account পাতা)।',
        'আপনার অ্যাকাউন্ট স্থগিত হলে এবং তা ভুল মনে হলে উপরের সহায়তা যোগাযোগে জানান। [PLACEHOLDER — আপিল প্রক্রিয়া পরিচালকের নিশ্চিত করার বিষয়।]',
        'আপনি যেকোনো সময় সাইন আউট করে DiplomaMate ব্যবহার বন্ধ করতে পারেন, এবং গোপনীয়তা নীতিতে বর্ণিতভাবে অ্যাকাউন্ট মুছে ফেলতে পারেন।'
      ]
    },
    {
      h: '১০. দায় ও দাবিত্যাগ',
      b: [
        'অ্যাপের রেজাল্ট, নোট, চাকরি ও নোটিশ যেমন আছে তেমনই দেওয়া হয়। কোনো কিছুর জন্য আবেদন করার আগে বা কোনো রেজাল্টের উপর নির্ভর করার আগে মূল উৎসে সময়সীমা ও বিবরণ যাচাই করুন।',
        'BTEB ও আপনার পলিটেকনিক রেজিস্ট্রার কর্তৃক জারি করা স্বাক্ষরিত কাগজের গেজেট এবং অফিসিয়াল ট্রান্সক্রিপ্টই আপনার রেজাল্টের অফিসিয়াল আইনি প্রমাণ — অ্যাপ নয়।',
        'তৃতীয় পক্ষের সাইটের কনটেন্ট, অন্য ব্যবহারকারীদের পোস্ট করা ভুল তথ্য, বা অ্যাপ ব্যবহারের ফলে হওয়া কোনো ক্ষতির জন্য আইন যতটুকু অনুমতি দেয়, DiplomaMate ততটুকু দায়ী নয়।'
      ]
    },
    {
      h: '১১. প্রযোজ্য আইন',
      b: [
        'এই শর্তাবলি বাংলাদেশের আইন দ্বারা পরিচালিত হবে। DiplomaMate সম্পর্কে যেকোনো বিরোধ বাংলাদেশের আইনে নিষ্পত্তি হবে।'
      ]
    },
    {
      h: '১২. এই শর্তাবলির পরিবর্তন',
      b: [
        'এই শর্তাবলিতে গুরুত্বপূর্ণ পরিবর্তন হলে নতুন সংস্করণ অ্যাপে দেখানো হবে। পরিবর্তনের পর DiplomaMate ব্যবহার চালিয়ে গেলে আপনি নতুন শর্তাবলি মেনে নিচ্ছেন বলে ধরা হবে।'
      ]
    },
    {
      h: '১৩. যোগাযোগ',
      b: [
        'পরিচালক: [PLACEHOLDER — আইনি নাম]।',
        'সহায়তা যোগাযোগ: its.tanjim.06@gmail.com।',
        'গোপনীয়তা বিষয়ক প্রশ্ন: গোপনীয়তা নীতি দেখুন, অথবা যোগাযোগ করুন its.tanjim.06@gmail.com।'
      ]
    }
  ]
};

export const TermsScreen: React.FC = () => {
  const { isLoggedIn, setActiveScreen } = useApp();
  const { lang } = useLanguage();
  const L = lang === 'bn' ? BN : EN;

  return (
    <div className="min-h-screen bg-app-bg flex flex-col py-8 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-2xl">
        <button
          type="button"
          onClick={() => setActiveScreen(isLoggedIn ? 'home' : 'welcome')}
          className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-text-primary cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{lang === 'bn' ? 'ফিরে যান' : 'Back'}</span>
        </button>

        <div className="dm-card p-5 sm:p-6 space-y-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-brand-blue flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-text-primary">{L.title}</h1>
              <p className="text-[11px] text-slate-500 mt-0.5">{L.updated}</p>
            </div>
          </div>

          <div className="space-y-2 text-xs leading-relaxed text-slate-700">
            {L.intro.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>

          {L.sections.map((s) => (
            <section key={s.h} className="space-y-2">
              <h2 className="text-sm font-bold text-text-primary">{s.h}</h2>
              <div className="space-y-1.5 text-xs leading-relaxed text-slate-700">
                {s.b.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
};
