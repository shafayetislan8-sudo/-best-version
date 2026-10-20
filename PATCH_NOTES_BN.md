# আয়-ব্যয় অ্যাপ — রক্ষণাবেক্ষণ প্যাচ

## এই প্যাচে যা পরিবর্তন করা হয়েছে

- নতুন লেনদেনের তারিখ ও সময় এখন ডিভাইসের বর্তমান তারিখ/সময় থেকে শুরু হয়; ২০২৬ সালের নির্দিষ্ট তারিখ আর ডিফল্ট নয়।
- তারিখ বাছাইয়ের ক্যালেন্ডারে আগের/পরের মাসের বাটন কাজ করে এবং মাস/বছর ও সপ্তাহের দিন নির্বাচিত তারিখ অনুযায়ী দেখায়।
- লেনদেন এডিট থেকে নতুন লেনদেনে গেলে তারিখ/সময় ও ফর্মের প্রাথমিক অবস্থা রিসেট হয়।
- ক্যালকুলেটর থেকে `Function()`-ভিত্তিক expression execution সরিয়ে সীমিত arithmetic parser ব্যবহার করা হয়েছে; ভাগ শূন্য দিয়ে করা এবং invalid expression প্রত্যাখ্যান করা হয়।
- রসিদের ছবি গ্রহণের আগে image type/size যাচাই এবং JPEG compression যোগ হয়েছে, যাতে Firestore document size limit অতিক্রমের ঝুঁকি কমে।
- নতুন ইনস্টলে অ্যাকাউন্ট ব্যালেন্স আর কল্পিত ৫,০০০/১২,৫০০/৩,২০০/৪৫,০০০ টাকা দেখায় না; সব শূন্য থেকে শুরু হয়। আগের ডিভাইসে ইতিমধ্যে সংরক্ষিত অ্যাকাউন্ট ডেটা মুছে ফেলা হয়নি।
- নতুন ইনস্টলে কাল্পনিক নোট, recurring payment এবং মেস সদস্য/জমার উদাহরণ স্বয়ংক্রিয়ভাবে যোগ হয় না। মেসের প্রাথমিক বাজার খরচও শূন্য।
- ব্যক্তিগত ইমেইল ডিফল্ট কোড থেকে সরানো হয়েছে; প্রোফাইলের ইমেইল লগইন করা ব্যবহারকারীর তথ্য থেকে আসবে।
- Local Storage বন্ধ বা পূর্ণ হলে সংরক্ষণ ব্যর্থতার কারণে অ্যাপ ক্র্যাশ না করার জন্য defensive persistence যোগ হয়েছে।
- Firebase full backup-এর batch commit-এর পরে নতুন `WriteBatch` তৈরি করা হয়; বড় ব্যাকআপে আগের batch পুনরায় commit হওয়ার ঝুঁকি ঠিক করা হয়েছে।
- Firebase restore-এর সময় শুধু লেনদেন নয়, সেটিংস, অ্যাকাউন্ট, ক্যাটাগরি, সঞ্চয়, টাস্ক, নোট, recurring item ও trash-এর উপস্থিতিও cloud data হিসেবে বিবেচিত হয়।
- Custom categories ও recycle-bin items cloud backup/restore-এ যুক্ত করা হয়েছে; Firestore rules-এ তাদের নিজস্ব user-isolated paths যোগ হয়েছে।
- JSON backup-এ recurring items ও trash অন্তর্ভুক্ত হয়েছে; recycle bin খালি করলে signed-in অবস্থায় cloud records-ও delete করার চেষ্টা করা হয়।
- মেস হিসাব, দেনা-পাওনা এবং সঞ্চয় স্ক্রিনে স্থির অক্টোবর ২০২৬-এর তারিখ/শিরোনামের বদলে বর্তমান মাস/তারিখ দেখানোর পরিবর্তন করা হয়েছে।

## যাচাইয়ের অবস্থা

- পরিবর্তিত ফাইলগুলোতে স্থির ২০২৬ তারিখ, হার্ডকোড করা ব্যক্তিগত ইমেইল এবং খালি ক্যালেন্ডার click handler খোঁজা হয়েছে।
- TypeScript compiler চালানো হয়েছে, কিন্তু dependencies (`react`, `firebase`, `vite/client` ইত্যাদি) ইনস্টল করা নেই। নেটওয়ার্ক/ক্যাশ সীমাবদ্ধতার কারণে `npm ci` সম্পন্ন হয়নি; তাই পূর্ণ type-check, production build, APK build এবং runtime/Firebase integration test এই পরিবেশে চালানো যায়নি।
- Firebase project-এর বাস্তব Rules deployment, Google OAuth authorized domains, এবং live Firestore data যাচাই করা হয়নি। `firestore.rules` ফাইলটি প্যাচ করা হয়েছে, কিন্তু Firebase Console/CLI-তে deploy না করা পর্যন্ত লাইভ প্রজেক্টে তা কার্যকর হবে—এমন দাবি করা হচ্ছে না।

## APK/ওয়েব প্রকাশের আগে

1. `npm ci`
2. `npm run lint`
3. `npm run build`
4. `npx cap sync android`
5. Firebase Console-এ Rules পরীক্ষা/ডিপ্লয় এবং Google sign-in authorized domains যাচাই
6. নতুন ও বিদ্যমান অ্যাকাউন্ট দিয়ে restore, sync, transaction add/edit/delete, export/import এবং offline behavior পরীক্ষা

**সতর্কতা:** পুরোনো লোকাল স্টোরেজে আগের ডেমো ব্যালেন্স/নোট/recurring item থাকলে এই প্যাচ সেগুলো স্বয়ংক্রিয়ভাবে মুছে দেয় না, যাতে ব্যবহারকারীর সংরক্ষিত ডেটা হারিয়ে না যায়। প্রয়োজন হলে অ্যাপের ভেতর থেকে সেগুলো নিজে যাচাই/সম্পাদনা করুন।

## অতিরিক্ত লাইভ-সিঙ্ক সংশোধন

- Firestore-এর `onSnapshot` listener যোগ করা হয়েছে, যাতে একই Google account-এ লগইন করা অন্য ডিভাইসে transactions, categories, accounts, persons, budgets, savings, tasks, notes, recurring items, trash এবং settings-এর cloud পরিবর্তন রিয়েল-টাইমে অ্যাপে আসে।
- প্রথমবার লগইনের সময় আগে cloud data restore/initial local backup করা হয়; এরপর live listeners চালু হয়।
- প্রতিটি listener-এর error আলাদাভাবে লগ করা হয় এবং sync status-এ error দেখানো হয়।

## গুরুত্বপূর্ণ Firebase সেটিং

`auth/unauthorized-domain` কোনো TypeScript/React কোড দিয়ে নিরাপদভাবে বাইপাস করা যায় না। যে HTTPS Preview/Deployment origin-এ অ্যাপটি খোলা হয়, তার hostname Firebase Console → Authentication → Settings → Authorized domains-এ যোগ করতে হবে। `https://` বা path নয়—শুধু hostname যোগ করুন। Firebase Console-এ Google provider enabled থাকতে হবে।

এই পরিবেশে dependency install/build সম্ভব হয়নি, তাই বাস্তব Firebase project-এ Google login ও multi-device live sync এখনও হাতে-কলমে যাচাই করা হয়নি।
