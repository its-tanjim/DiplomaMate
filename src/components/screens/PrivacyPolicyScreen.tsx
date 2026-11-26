import React from 'react';
import { useApp } from '../../context/AppContext';
import { useLanguage } from '../../context/LanguageContext';
import { ArrowLeft, AlertTriangle, ShieldCheck } from 'lucide-react';

// Privacy Policy — version 2026-11-26.
// Grounded ONLY in real app behaviour verified in the 2026-11-26 compliance
// audit: roll+PIN login, salted PIN hashes, JSON store + Supabase, Render
// hosting, Gemini document scan, BTEB Result Zone + Official BTEB iframes,
// Turnstile, social login only-if-enabled, no analytics SDK found in code,
// SMS verification currently OFF. Facts the audit could not verify are
// marked [PLACEHOLDER] — do not invent them.

type Section = { h: string; b: string[] };

const EN: { title: string; updated: string; intro: string[]; backupTitle: string; backup: string[]; sections: Section[] } = {
  title: 'Privacy Policy',
  updated: 'Last updated: 26 November 2026 · Version 2026-11-26',
  intro: [
    'DiplomaMate is an app for BTEB Diploma in Engineering students, teachers, class captains and administrators of polytechnic institutes in Bangladesh. It helps students follow their class routine, results, notes, assignments, jobs and community groups.',
    'Data controller / operator: [PLACEHOLDER — legal name of the person or organisation that operates DiplomaMate]. Privacy contact: [PLACEHOLDER — privacy contact email]. If you have a question about your data, contact us at that address.',
    'This policy explains what data DiplomaMate collects, why, where it is stored, who can see it, how long it is kept, and how you can ask for it to be deleted.'
  ],
  backupTitle: 'Important — please read: your account data is copied to a public GitHub repository',
  backup: [
    'DiplomaMate keeps its account store in a file (data/academic-store.json) on its server. Until the planned move to Supabase is complete, the server automatically commits that whole file to the public GitHub repository its-tanjim/DiplomaMate after every change (about 60 seconds later).',
    'That means the full account store — including names, board rolls, registration numbers, phone numbers, email addresses and salted PIN hashes — is copied into a public repository that anyone on the internet can read. Your PIN itself is never stored in plain text (see Security below), but the hashed form of it is in that public copy.',
    'We are telling you this plainly because you should know it before you create an account. The durable fix — moving all account data to Supabase and switching this backup off — is in progress.'
  ],
  sections: [
    {
      h: '1. Data we collect',
      b: [
        'Account data: your name, board roll, registration number, college, department, semester, shift, section, session, phone number and email address (if you give one).',
        'Login credential: a 4–6 digit PIN that you choose. We store only a salted hash of your PIN, never the PIN itself in plain text.',
        'Content you create: community messages and files, notes, assignments and submissions, job posts, campus notices, reminders, attendance records, and marks / GPA you save.',
        'Result lookups: when you look up a gazette result we send your board roll (and regulation) to the server for the lookup. Roll queries for gazette lookup are not saved to disk.',
        'Device / usage data: we do not run any analytics or crash-reporting SDK in the app — no analytics or crash-reporting tool was found in the app code. The app does store your profile, session token, routines and notes on your own device (local storage) so it works offline.',
        'What we do NOT collect: the app asks for no camera, location, microphone, contacts or storage permission. Files are picked with the normal file picker.'
      ]
    },
    {
      h: '2. How we use your data',
      b: [
        'To identify your account and enforce one board roll = one account.',
        'To show you the right cohort — your college, department, semester, shift and section — for routines, rosters, attendance and communities.',
        'To run the class-captain verification workflow (your request goes to your semester’s guide teacher and the admin) and teacher endorsement.',
        'To deliver community membership, messages, notes, assignments, jobs and notices to the right people.',
        'We do not sell your data and we do not use it for advertising.'
      ]
    },
    {
      h: '3. Where your data is stored and who processes it',
      b: [
        'Render (server hosting): the DiplomaMate server runs on Render. Your account data lives in the server’s JSON store (data/academic-store.json) and, where the migration has reached, in Supabase Postgres (Singapore region).',
        'GitHub (automatic backup): as explained in the box above, the whole account store is committed to the public GitHub repository its-tanjim/DiplomaMate until the Supabase move is complete.',
        'Supabase: where migrated, account and academic records are stored in Supabase Postgres and files in Supabase Storage (buckets such as community-files).',
        'Google Gemini (document scanning): when you upload a routine, note, assignment or other document for text extraction, the document is sent to Google’s Gemini API for OCR / text extraction.',
        'Cloudflare Turnstile (bot check): the sign-in and sign-up screens show a Turnstile check when a site key is configured, to stop automated abuse.',
        'BTEB Result Zone and Official BTEB (result iframes): results are shown inside the app from btebresultszone.com and result.bteb.gov.bd. Those pages are run by their own owners, not by DiplomaMate — DiplomaMate cannot read what is inside them, and the roll you type on those pages is visible to that site. BTEB Result Zone is a third-party site; the official BTEB portal is BTEB’s own.',
        'Google / Facebook (social sign-in, only if enabled): Google and Facebook sign-in buttons appear only when the app is configured with their client IDs. In the current live build neither button appears, so no data goes to Google or Facebook for sign-in. If social sign-in is ever enabled, only your verified email is used, to link to an account you already registered.',
        'Google Fonts: the app loads its fonts (Plus Jakarta Sans, JetBrains Mono) from Google Fonts, which sees the usual request details (IP address, browser) when your device fetches them.',
        'SMS verification is currently OFF. No SMS provider receives your phone number or any code today. If SMS login codes are ever switched on, this policy will name the provider first.'
      ]
    },
    {
      h: '4. Who can see your data',
      b: [
        'Your guide teacher and the institute admin can see captain verification requests and the accounts in their cohort.',
        'Community members can see the messages and files you post in their groups.',
        'Teachers and class captains can see the roster, attendance and notes for their cohort.',
        'Marks and GPA you save are private to your account and enforced on the server.',
        'Nobody else inside the app can see your personal data. The exception is the public GitHub backup described above, which anyone on the internet can read until it is switched off.'
      ]
    },
    {
      h: '5. How long we keep your data, and deletion',
      b: [
        'We keep your account data while your account exists, and delete it when your account is deleted.',
        'To delete your account, use Settings → “Delete my account” while signed in, or open the public page at /delete-account and verify with your board roll and PIN. Your request is queued for the admin, and your personal data is then hard-erased.',
        'What is kept after deletion: only anonymised academic records (for example attendance or result records with personal details removed). No name, roll, registration number, phone, email or PIN hash is kept.',
        'Admin deactivation is different from deletion: an admin can deactivate an account, but deactivation keeps the account record. Full erasure happens only through a deletion request.'
      ]
    },
    {
      h: '6. Your rights and choices',
      b: [
        'You can view and edit your profile information in the app (Profile → Edit).',
        'You can ask for a copy of your data, for a correction, or for deletion by contacting the privacy contact above or by using the in-app deletion request.',
        'You can sign out at any time; signing out does not delete your account.',
        'If you do not agree to this policy, do not create an account.'
      ]
    },
    {
      h: '7. Security',
      b: [
        'PINs are stored only as salted hashes, never in plain text.',
        'Sign-in uses session tokens, auth routes are rate-limited, and academic data is scoped to your cohort (college / department / semester / shift / section).',
        'Admin sign-in is additionally protected: 5 failed admin password attempts lock the account for 15 minutes, and 3 wrong admin PINs lock the admin panel for 5 hours.',
        'Plainly stated: because the account store is currently also committed to a public GitHub repository (see the box at the top), the salted PIN hashes in that store are publicly readable. That is the single biggest security weakness of the current setup and the reason the Supabase move is under way. Choose a PIN you do not use anywhere else.'
      ]
    },
    {
      h: '8. Children and students',
      b: [
        'DiplomaMate is for diploma (BTEB) students, who are generally older school-leavers. The exact age range of users and the position on guardian consent is [PLACEHOLDER — to be confirmed by the operator].',
        'If you are under 18, please ask a parent or guardian before creating an account.'
      ]
    },
    {
      h: '9. Changes to this policy',
      b: [
        'If this policy changes in an important way, we will show the new version in the app and ask you to accept it again when you next sign up or sign in. The version date at the top of this page tells you which version you are reading.',
        'The GitHub-backup disclosure above will stay in this policy until the backup is switched off.'
      ]
    },
    {
      h: '10. Contact',
      b: [
        'Data controller / operator: [PLACEHOLDER — legal name].',
        'Privacy contact email: [PLACEHOLDER — privacy contact email].',
        'For account deletion, use Settings → “Delete my account” or the public /delete-account page in the app.'
      ]
    }
  ]
};

const BN: typeof EN = {
  title: 'গোপনীয়তা নীতি',
  updated: 'সর্বশেষ হালনাগাদ: ২৬ নভেম্বর ২০২৬ · সংস্করণ 2026-11-26',
  intro: [
    'DiplomaMate বাংলাদেশের পলিটেকনিক ইনস্টিটিউটের BTEB ডিপ্লোমা ইন ইঞ্জিনিয়ারিং শিক্ষার্থী, শিক্ষক, ক্লাস ক্যাপ্টেন এবং অ্যাডমিনদের জন্য একটি অ্যাপ। এটি শিক্ষার্থীদের ক্লাস রুটিন, রেজাল্ট, নোট, অ্যাসাইনমেন্ট, চাকরি এবং কমিউনিটি গ্রুপ অনুসরণ করতে সাহায্য করে।',
    'ডেটা নিয়ন্ত্রক / পরিচালক: [PLACEHOLDER — DiplomaMate পরিচালনাকারী ব্যক্তি বা প্রতিষ্ঠানের আইনি নাম]। গোপনীয়তা যোগাযোগ: [PLACEHOLDER — গোপনীয়তা যোগাযোগের ইমেইল]। আপনার ডেটা সম্পর্কে কোনো প্রশ্ন থাকলে ওই ঠিকানায় যোগাযোগ করুন।',
    'এই নীতিতে বলা হয়েছে DiplomaMate কী ডেটা সংগ্রহ করে, কেন করে, কোথায় সংরক্ষণ করে, কে দেখতে পারে, কতদিন রাখা হয় এবং কীভাবে মুছে ফেলার অনুরোধ করবেন।'
  ],
  backupTitle: 'গুরুত্বপূর্ণ — দয়া করে পড়ুন: আপনার অ্যাকাউন্টের ডেটা একটি পাবলিক GitHub রিপোজিটরিতে কপি করা হয়',
  backup: [
    'DiplomaMate তার অ্যাকাউন্টের তথ্য সার্ভারের একটি ফাইলে (data/academic-store.json) রাখে। Supabase-এ স্থানান্তর শেষ না হওয়া পর্যন্ত, প্রতিটি পরিবর্তনের প্রায় ৬০ সেকেন্ড পর সার্ভার স্বয়ংক্রিয়ভাবে পুরো ফাইলটি পাবলিক GitHub রিপোজিটরি its-tanjim/DiplomaMate-এ কমিট করে।',
    'এর মানে হলো পুরো অ্যাকাউন্টের তথ্য — নাম, বোর্ড রোল, রেজিস্ট্রেশন নম্বর, ফোন নম্বর, ইমেইল ঠিকানা এবং সল্টেড PIN হ্যাশসহ — এমন একটি পাবলিক রিপোজিটরিতে কপি হয় যা ইন্টারনেটের যে কেউ পড়তে পারে। আপনার PIN কখনোই সরল টেক্সটে সংরক্ষণ করা হয় না (নিচে নিরাপত্তা দেখুন), তবে তার হ্যাশ করা রূপ ওই পাবলিক কপিতে থাকে।',
    'আপনি অ্যাকাউন্ট খোলার আগেই এটি জানা উচিত বলেই আমরা স্পষ্টভাবে জানাচ্ছি। স্থায়ী সমাধান — সব অ্যাকাউন্ট ডেটা Supabase-এ নিয়ে এই ব্যাকআপ বন্ধ করা — চলমান আছে।'
  ],
  sections: [
    {
      h: '১. আমরা কী ডেটা সংগ্রহ করি',
      b: [
        'অ্যাকাউন্টের ডেটা: আপনার নাম, বোর্ড রোল, রেজিস্ট্রেশন নম্বর, কলেজ, বিভাগ, সেমিস্টার, শিফট, সেকশন, সেশন, ফোন নম্বর এবং ইমেইল ঠিকানা (যদি দেন)।',
        'লগইন তথ্য: আপনার বেছে নেওয়া ৪–৬ সংখ্যার PIN। আমরা শুধু PIN-এর সল্টেড হ্যাশ সংরক্ষণ করি, PIN সরল টেক্সটে কখনোই রাখি না।',
        'আপনার তৈরি কনটেন্ট: কমিউনিটি মেসেজ ও ফাইল, নোট, অ্যাসাইনমেন্ট ও জমা, চাকরির পোস্ট, ক্যাম্পাস নোটিশ, রিমাইন্ডার, উপস্থিতির রেকর্ড এবং আপনার সংরক্ষিত নম্বর / GPA।',
        'রেজাল্ট খোঁজা: গেজেট রেজাল্ট খুঁজতে আপনার বোর্ড রোল (ও রেগুলেশন) সার্ভারে পাঠানো হয়। গেজেট খোঁজার রোল ডিস্কে সংরক্ষণ করা হয় না।',
        'ডিভাইস / ব্যবহারের ডেটা: অ্যাপে কোনো অ্যানালিটিক্স বা ক্র্যাশ-রিপোর্টিং SDK চলে না — অ্যাপের কোডে এমন কোনো টুল পাওয়া যায়নি। অ্যাপটি অফলাইনে কাজ করার জন্য আপনার প্রোফাইল, সেশন টোকেন, রুটিন ও নোট আপনার ডিভাইসে (লোকাল স্টোরেজ) রাখে।',
        'যা আমরা সংগ্রহ করি না: অ্যাপটি ক্যামেরা, লোকেশন, মাইক্রোফোন, কনট্যাক্ট বা স্টোরেজের অনুমতি চায় না। ফাইল সাধারণ ফাইল পিকার দিয়ে বেছে নেওয়া হয়।'
      ]
    },
    {
      h: '২. আপনার ডেটা কীভাবে ব্যবহার করি',
      b: [
        'আপনার অ্যাকাউন্ট শনাক্ত করতে এবং এক বোর্ড রোল = এক অ্যাকাউন্ট নিয়ম মানতে।',
        'আপনার সঠিক কোহর্ট — কলেজ, বিভাগ, সেমিস্টার, শিফট ও সেকশন — অনুযায়ী রুটিন, রোস্টার, উপস্থিতি ও কমিউনিটি দেখাতে।',
        'ক্লাস ক্যাপ্টেন যাচাইকরণ প্রক্রিয়া চালাতে (আপনার অনুরোধ আপনার সেমিস্টারের গাইড শিক্ষক ও অ্যাডমিনের কাছে যায়) এবং শিক্ষকের অনুমোদন নিতে।',
        'সঠিক মানুষের কাছে কমিউনিটি সদস্যপদ, মেসেজ, নোট, অ্যাসাইনমেন্ট, চাকরি ও নোটিশ পৌঁছে দিতে।',
        'আমরা আপনার ডেটা বিক্রি করি না এবং বিজ্ঞাপনের জন্য ব্যবহার করি না।'
      ]
    },
    {
      h: '৩. আপনার ডেটা কোথায় সংরক্ষিত হয় এবং কে প্রক্রিয়া করে',
      b: [
        'Render (সার্ভার হোস্টিং): DiplomaMate সার্ভার Render-এ চলে। আপনার অ্যাকাউন্টের ডেটা সার্ভারের JSON স্টোরে (data/academic-store.json) এবং যেখানে স্থানান্তর হয়েছে সেখানে Supabase Postgres-এ (সিঙ্গাপুর অঞ্চল) থাকে।',
        'GitHub (স্বয়ংক্রিয় ব্যাকআপ): উপরের বাক্সে যেমন বলা হয়েছে, Supabase-এ স্থানান্তর শেষ না হওয়া পর্যন্ত পুরো অ্যাকাউন্ট স্টোর পাবলিক GitHub রিপোজিটরি its-tanjim/DiplomaMate-এ কমিট করা হয়।',
        'Supabase: যেখানে স্থানান্তর হয়েছে, অ্যাকাউন্ট ও একাডেমিক রেকর্ড Supabase Postgres-এ এবং ফাইল Supabase Storage-এ (যেমন community-files বাকেট) সংরক্ষিত হয়।',
        'Google Gemini (ডকুমেন্ট স্ক্যান): টেক্সট বের করার জন্য রুটিন, নোট, অ্যাসাইনমেন্ট বা অন্য কোনো ডকুমেন্ট আপলোড করলে ডকুমেন্টটি OCR / টেক্সট বের করার জন্য Google-এর Gemini API-তে পাঠানো হয়।',
        'Cloudflare Turnstile (বট যাচাই): সাইট কি কনফিগার করা থাকলে সাইন-ইন ও সাইন-আপ পর্দায় স্বয়ংক্রিয় অপব্যবহার ঠেকাতে Turnstile যাচাই দেখানো হয়।',
        'BTEB Result Zone এবং Official BTEB (রেজাল্ট iframe): রেজাল্ট অ্যাপের ভেতরে btebresultszone.com ও result.bteb.gov.bd থেকে দেখানো হয়। এই পাতাগুলো তাদের নিজস্ব মালিকদের পরিচালিত, DiplomaMate-এর নয় — DiplomaMate এর ভেতরে কী আছে তা পড়তে পারে না, এবং ওই পাতায় আপনি যে রোল টাইপ করেন তা ওই সাইট দেখতে পায়। BTEB Result Zone একটি তৃতীয় পক্ষের সাইট; অফিসিয়াল BTEB পোর্টাল BTEB-এর নিজস্ব।',
        'Google / Facebook (সোশ্যাল সাইন-ইন, শুধু চালু থাকলে): Google ও Facebook সাইন-ইন বোতাম তখনই দেখা যায় যখন অ্যাপে তাদের ক্লায়েন্ট ID কনফিগার করা থাকে। বর্তমান লাইভ সংস্করণে কোনো বোতামই দেখা যায় না, তাই সাইন-ইনের জন্য Google বা Facebook-এ কোনো ডেটা যায় না। সোশ্যাল সাইন-ইন কখনো চালু হলে শুধু আপনার যাচাই করা ইমেইল ব্যবহার করা হবে, আপনার আগে থেকে নিবন্ধিত অ্যাকাউন্টের সঙ্গে যুক্ত করতে।',
        'Google Fonts: অ্যাপ তার ফন্ট (Plus Jakarta Sans, JetBrains Mono) Google Fonts থেকে লোড করে; আপনার ডিভাইস ফন্ট আনতে গেলে Google সাধারণ অনুরোধের তথ্য (IP ঠিকানা, ব্রাউজার) দেখতে পায়।',
        'SMS যাচাইকরণ বর্তমানে বন্ধ আছে। আজ কোনো SMS প্রদানকারীর কাছে আপনার ফোন নম্বর বা কোনো কোড যায় না। SMS লগইন কোড কখনো চালু হলে এই নীতিতে আগে প্রদানকারীর নাম লেখা হবে।'
      ]
    },
    {
      h: '৪. আপনার ডেটা কে দেখতে পারে',
      b: [
        'আপনার গাইড শিক্ষক ও ইনস্টিটিউটের অ্যাডমিন ক্যাপ্টেন যাচাইকরণের অনুরোধ এবং তাদের কোহর্টের অ্যাকাউন্ট দেখতে পারেন।',
        'কমিউনিটির সদস্যরা তাদের গ্রুপে আপনার পোস্ট করা মেসেজ ও ফাইল দেখতে পারেন।',
        'শিক্ষক ও ক্লাস ক্যাপ্টেনরা তাদের কোহর্টের রোস্টার, উপস্থিতি ও নোট দেখতে পারেন।',
        'আপনার সংরক্ষিত নম্বর ও GPA শুধু আপনার অ্যাকাউন্টের জন্য ব্যক্তিগত এবং সার্ভারে তা কার্যকর করা হয়।',
        'অ্যাপের ভেতরে আর কেউ আপনার ব্যক্তিগত ডেটা দেখতে পারে না। ব্যতিক্রম হলো উপরে বর্ণিত পাবলিক GitHub ব্যাকআপ, যা বন্ধ না হওয়া পর্যন্ত ইন্টারনেটের যে কেউ পড়তে পারে।'
      ]
    },
    {
      h: '৫. আপনার ডেটা কতদিন রাখা হয়, এবং মুছে ফেলা',
      b: [
        'আপনার অ্যাকাউন্ট থাকা পর্যন্ত আমরা আপনার অ্যাকাউন্টের ডেটা রাখি, আর অ্যাকাউন্ট মুছে ফেললে তা মুছে ফেলা হয়।',
        'অ্যাকাউন্ট মুছতে সাইন ইন অবস্থায় Settings → “Delete my account” ব্যবহার করুন, অথবা অ্যাপের পাবলিক /delete-account পাতায় গিয়ে আপনার বোর্ড রোল ও PIN দিয়ে যাচাই করুন। আপনার অনুরোধ অ্যাডমিনের কাছে সারিতে যায়, তারপর আপনার ব্যক্তিগত ডেটা পুরোপুরি মুছে ফেলা হয়।',
        'মুছে ফেলার পর যা রাখা হয়: শুধু নামবিহীন (anonymised) একাডেমিক রেকর্ড (যেমন ব্যক্তিগত তথ্য সরানো উপস্থিতি বা রেজাল্টের রেকর্ড)। নাম, রোল, রেজিস্ট্রেশন নম্বর, ফোন, ইমেইল বা PIN হ্যাশ কিছুই রাখা হয় না।',
        'অ্যাডমিনের নিষ্ক্রিয় করা আর মুছে ফেলা এক নয়: অ্যাডমিন অ্যাকাউন্ট নিষ্ক্রিয় করতে পারেন, কিন্তু তাতে অ্যাকাউন্টের রেকর্ড থেকে যায়। পুরো মুছে ফেলা শুধু মুছে ফেলার অনুরোধের মাধ্যমেই হয়।'
      ]
    },
    {
      h: '৬. আপনার অধিকার ও পছন্দ',
      b: [
        'অ্যাপে (Profile → Edit) আপনার প্রোফাইলের তথ্য দেখতে ও বদলাতে পারেন।',
        'উপরের গোপনীয়তা যোগাযোগের মাধ্যমে বা অ্যাপের ভেতরের মুছে ফেলার অনুরোধ দিয়ে আপনার ডেটার কপি, সংশোধন বা মুছে ফেলার অনুরোধ করতে পারেন।',
        'যেকোনো সময় সাইন আউট করতে পারেন; সাইন আউট করলে অ্যাকাউন্ট মুছে যায় না।',
        'এই নীতিতে রাজি না হলে অ্যাকাউন্ট খুলবেন না।'
      ]
    },
    {
      h: '৭. নিরাপত্তা',
      b: [
        'PIN শুধু সল্টেড হ্যাশ হিসেবে সংরক্ষণ করা হয়, সরল টেক্সটে কখনোই নয়।',
        'সাইন-ইনে সেশন টোকেন ব্যবহার হয়, লগইন রুটে হার-সীমা (rate limit) আছে, এবং একাডেমিক ডেটা আপনার কোহর্টের (কলেজ / বিভাগ / সেমিস্টার / শিফট / সেকশন) মধ্যে সীমাবদ্ধ।',
        'অ্যাডমিন সাইন-ইনে অতিরিক্ত সুরক্ষা আছে: ৫ বার ভুল অ্যাডমিন পাসওয়ার্ড দিলে অ্যাকাউন্ট ১৫ মিনিটের জন্য লক হয়, আর ৩ বার ভুল অ্যাডমিন PIN দিলে অ্যাডমিন প্যানেল ৫ ঘণ্টার জন্য লক হয়।',
        'স্পষ্টভাবে বলা হচ্ছে: অ্যাকাউন্ট স্টোরটি বর্তমানে একটি পাবলিক GitHub রিপোজিটরিতেও কমিট করা হয় (উপরের বাক্স দেখুন), তাই ওই স্টোরের সল্টেড PIN হ্যাশগুলো প্রকাশ্যে পড়া যায়। বর্তমান ব্যবস্থার এটাই সবচেয়ে বড় নিরাপত্তা দুর্বলতা এবং এ কারণেই Supabase-এ স্থানান্তর চলছে। এমন PIN বেছে নিন যা আপনি আর কোথাও ব্যবহার করেন না।'
      ]
    },
    {
      h: '৮. শিশু ও শিক্ষার্থী',
      b: [
        'DiplomaMate ডিপ্লোমা (BTEB) শিক্ষার্থীদের জন্য, যারা সাধারণত স্কুল শেষ করা বয়স্ক শিক্ষার্থী। ব্যবহারকারীদের সঠিক বয়সসীমা এবং অভিভাবকের সম্মতি সম্পর্কে অবস্থান [PLACEHOLDER — পরিচালকের নিশ্চিত করার বিষয়]।',
        'আপনার বয়স ১৮ বছরের কম হলে অ্যাকাউন্ট খোলার আগে বাবা-মা বা অভিভাবকের কাছে জিজ্ঞাসা করুন।'
      ]
    },
    {
      h: '৯. এই নীতির পরিবর্তন',
      b: [
        'এই নীতিতে গুরুত্বপূর্ণ পরিবর্তন হলে নতুন সংস্করণ অ্যাপে দেখানো হবে এবং পরের সাইন-আপ বা সাইন-ইনে আবার আপনার সম্মতি চাওয়া হবে। এই পাতার উপরের সংস্করণের তারিখ দেখে বুঝবেন আপনি কোন সংস্করণ পড়ছেন।',
        'ব্যাকআপ বন্ধ না হওয়া পর্যন্ত উপরের GitHub-ব্যাকআপের ঘোষণা এই নীতিতে থাকবে।'
      ]
    },
    {
      h: '১০. যোগাযোগ',
      b: [
        'ডেটা নিয়ন্ত্রক / পরিচালক: [PLACEHOLDER — আইনি নাম]।',
        'গোপনীয়তা যোগাযোগের ইমেইল: [PLACEHOLDER — গোপনীয়তা যোগাযোগের ইমেইল]।',
        'অ্যাকাউন্ট মুছতে Settings → “Delete my account” ব্যবহার করুন অথবা অ্যাপের পাবলিক /delete-account পাতা ব্যবহার করুন।'
      ]
    }
  ]
};

export const PrivacyPolicyScreen: React.FC = () => {
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
              <ShieldCheck className="w-5 h-5" />
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

          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 space-y-2">
            <p className="text-xs font-bold flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {L.backupTitle}
            </p>
            {L.backup.map((p, i) => (
              <p key={i} className="text-[11px] leading-relaxed">{p}</p>
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
