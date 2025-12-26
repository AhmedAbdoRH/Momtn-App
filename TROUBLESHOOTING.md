# 🛠️ دليل حل المشاكل - Troubleshooting Guide

## 🚨 مشكلة "Unable to load script"

### **الأعراض:**
```
Unable to load script. Make sure you're either:
- running Metro bundler
- running a bundle script
```

### **الحلول السريعة:**

#### **1. إعادة تشغيل Metro:**
```bash
# في نافذة منفصلة
npm run start:clean
```

#### **2. إعداد المنفذ:**
```bash
adb reverse tcp:8081 tcp:8081
```

#### **3. إعادة تشغيل التطبيق:**
```bash
# إيقاف التطبيق
adb shell am force-stop com.myapp1reactnative

# إعادة تشغيله
adb shell monkey -p com.myapp1reactnative -c android.intent.category.LAUNCHER 1
```

#### **4. الحل الكامل:**
```bash
# تشغيل Metro نظيف
npm run start:clean &

# انتظار 3 ثواني
timeout 3

# تشغيل التطبيق
npm run android:dev
```

### **🔍 استكشاف الأخطاء المتقدم:**

#### **التحقق من Metro:**
```bash
# في PowerShell
Get-Process | Where-Object {$_.ProcessName -like "*metro*" -or $_.ProcessName -like "*react*"}
```

#### **التحقق من المنفذ 8081:**
```bash
netstat -ano | findstr :8081
```

#### **التحقق من adb:**
```bash
adb devices
```

### **⚡ اختصارات مفيدة:**

#### **سكريبت إعادة التشغيل السريع:**
```json
// في package.json
"restart": "adb shell am force-stop com.myapp1reactnative && adb shell monkey -p com.myapp1reactnative -c android.intent.category.LAUNCHER 1"
```

#### **سكريبت التشغيل الكامل:**
```json
// في package.json
"dev:full": "npm run start:clean && timeout 3 && npm run android:dev"
```

### **📱 حلول خاصة بالأجهزة:**

#### **المحاكي (Emulator):**
```bash
# تأكد من تشغيل المحاكي أولاً
# ثم شغّل التطبيق
npm run android
```

#### **جهاز حقيقي (Physical Device):**
```bash
# 1. فعّل USB Debugging في الجهاز
# 2. شغّل التطبيق
npm run android

# أو في Dev Settings داخل التطبيق:
# Debug server host & port for device:
# 192.168.1.XXX:8081 (عنوان IP حاسوبك)
```

### **🔒 مشاكل الشبكة:**

#### **WiFi مختلف:**
```
# في Dev Settings داخل التطبيق:
# اختر "Debug server host & port for device"
# أدخل عنوان IP حاسوبك: 192.168.1.XXX:8081
```

#### **VPN أو Firewall:**
```
# قم بتعطيل VPN مؤقتاً
# أو أضف استثناء للمنفذ 8081 في Firewall
```

### **💻 حلول خاصة بالحاسوب:**

#### **مسح الكاش:**
```bash
# مسح كاش Metro تماماً
npm run start:clean

# أو يدوياً
rm -rf node_modules/.cache
```

#### **إعادة تثبيت المكتبات:**
```bash
# حذف node_modules وإعادة التثبيت
rm -rf node_modules package-lock.json
npm install
```

#### **تحديث React Native:**
```bash
npx react-native upgrade
```

### **🔧 إعدادات مفيدة:**

#### **تسريع Metro:**
```bash
# في package.json scripts
"start:fast": "react-native start --reset-cache --max-workers 2"
```

#### **تطوير بدون Hot Reload:**
```bash
# في package.json scripts
"start:dev": "react-native start --reset-cache --no-interactive"
```

### **📋 قائمة تحقق سريعة:**

- [ ] هل Metro يعمل؟ `npm run start:clean`
- [ ] هل المنفذ 8081 مفتوح؟ `adb reverse tcp:8081 tcp:8081`
- [ ] هل التطبيق متصل بالمحاكي؟ `adb devices`
- [ ] هل المحاكي يعمل؟ تحقق من Android Studio
- [ ] هل الشبكة مستقرة؟ جرب إعادة تشغيل الراوتر

### **🚀 الحل النهائي:**

إذا استمرت المشكلة، جرب هذا التسلسل:

```bash
# 1. أعد تشغيل المحاكي
# 2. شغّل Metro
npm run start:clean &

# 3. انتظر 5 ثواني
timeout 5

# 4. شغّل التطبيق
npm run android:dev

# 5. إذا لم يعمل، جرب إعادة تشغيل الحاسوب
```

---

**ملاحظة:** احفظ هذا الدليل للمراجعة المستقبلية! 🎯

