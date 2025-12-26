# 🛠️ نصائح المطور - Developer Tips

## 🚨 حل مشاكل "Could not connect to development server"

### **المشكلة الشائعة:**
```
Could not connect to development server.
Try the following to fix the issue:
```

### **الحلول السريعة:**

#### **1. إعادة تشغيل Metro:**
```bash
# إيقاف Metro (Ctrl+C في الطرفية)
npm run start:clean
```

#### **2. إعداد adb reverse:**
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

#### **4. التشغيل الكامل:**
```bash
# في نافذة منفصلة
npm run start:clean

# في نفس النافذة أو نافذة أخرى
npm run android:dev
```

### **🔧 استكشاف الأخطاء المتقدم:**

#### **التحقق من العمليات:**
```bash
# في PowerShell
Get-Process | Where-Object {$_.ProcessName -like "*metro*" -or $_.ProcessName -like "*react*"}
```

#### **التحقق من المنافذ:**
```bash
# في PowerShell
netstat -ano | findstr :8081
```

#### **التحقق من adb:**
```bash
adb devices
```

### **⚡ اختصارات سريعة:**

#### **إعادة تشغيل كامل:**
```bash
# 1. إيقاف Metro
# 2. مسح الكاش
npm run start:clean &

# 3. إعداد المنفذ
adb reverse tcp:8081 tcp:8081

# 4. إعادة تشغيل التطبيق
adb shell am force-stop com.myapp1reactnative
adb shell monkey -p com.myapp1reactnative -c android.intent.category.LAUNCHER 1
```

### **🔍 فحص السجلات:**

#### **سجلات Metro:**
```
# في نفس النافذة التي تشغل Metro
# ستظهر رسائل الخطأ والتحذيرات
```

#### **سجلات Android:**
```bash
# في Android Studio أو adb logcat
adb logcat | grep -E "(ReactNative|Metro|ERROR)"
```

### **⚙️ إعدادات مفيدة:**

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

### **📱 اختبار على أجهزة مختلفة:**

#### **المحاكي:**
```bash
npm run android
# أو
npx react-native run-android
```

#### **جهاز حقيقي:**
```bash
# تأكد من أن الجهاز متصل و USB Debugging مفعل
npm run android
# أو تغيير عنوان IP في Dev Settings إلى عنوان حاسوبك
```

### **🔒 حل مشاكل الشبكة:**

#### **في نفس الشبكة WiFi:**
```
# في Dev Settings داخل التطبيق:
# Debug server host & port for device:
# 192.168.1.XXX:8081
# (غير XXX بعنوان IP حاسوبك)
```

#### **مشاكل الـ VPN:**
```
# قم بتعطيل VPN مؤقتاً أثناء التطوير
# أو أضف استثناء للمنفذ 8081
```

### **💡 نصائح عامة:**

1. **احفظ عملك دائماً** قبل إعادة التشغيل
2. **استخدم Git** للتتبع والنسخ الاحتياطي
3. **أعد تشغيل المحاكي** إذا استمرت المشاكل
4. **تحقق من إصدارات المكتبات** بانتظام
5. **استخدم Visual Studio Code** للتطوير الأفضل

### **🚀 اختصار التشغيل السريع:**

```bash
# إنشاء سكريبت في package.json
"dev": "npm run start:clean & timeout 5 && npm run android:dev"
```

---

**ملاحظة:** هذه النصائح ستساعدك في حل معظم مشاكل التطوير في React Native! 🎯



