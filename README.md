# 📦 StockWise Mobile - Complete Bug Fixes Package

**Semua file yang sudah diperbaiki, siap copy-paste!**

---

## 📋 Daftar File yang Diperbaiki

| File | Lokasi di Project | Bug yang Diperbaiki |
|------|-------------------|---------------------|
| `App.js` | `/App.js` | Navigation timing issue |
| `package.json` | `/package.json` | Invalid dependencies removed |
| `NotificationService.js` | `/src/services/` | Null check for data object |
| `notifications.js` | `/src/database/queries/` | SQL injection vulnerability |
| `AndroidManifest.xml` | `/android/app/src/main/` | Duplicate permissions, invalid services |
| `file_paths.xml` | `/android/app/src/main/res/xml/` | NEW - FileProvider paths |
| `proguard-rules.pro` | `/android/app/` | NEW - ProGuard rules (untuk release nanti) |

---

## 🔧 Cara Pakai (Copy-Paste)

### Step 1: Backup Original Files
```bash
# Di folder project kamu
mkdir backup
cp App.js backup/
cp package.json backup/
cp src/services/NotificationService.js backup/
cp src/database/queries/notifications.js backup/
cp android/app/src/main/AndroidManifest.xml backup/
```

### Step 2: Replace Files

**Dari package ini, copy ke project kamu:**

```
COPY FROM                           →  TO (PROJECT KAMU)
─────────────────────────────────────────────────────────
App.js                              →  /App.js
package.json                        →  /package.json
src/services/NotificationService.js →  /src/services/NotificationService.js
src/database/queries/notifications.js → /src/database/queries/notifications.js
android/app/src/main/AndroidManifest.xml → /android/app/src/main/AndroidManifest.xml
android/app/src/main/res/xml/       →  /android/app/src/main/res/xml/ (buat folder jika belum ada)
android/app/proguard-rules.pro      →  /android/app/proguard-rules.pro
```

### Step 3: Install Dependencies (jika perlu)
```bash
cd /path/to/your/project
rm -rf node_modules
npm install
```

### Step 4: Build Debug APK
```bash
cd android
./gradlew clean
./gradlew assembleDebug
```

### Step 5: Get Your APK
```
APK Location: android/app/build/outputs/apk/debug/app-debug.apk
```

---

## 🐛 Detail Bug Fixes

### 1. App.js - Navigation Timing Fix
**Problem:** `setupNotificationHandler` dipanggil sebelum navigation ready
**Solution:** Menggunakan `onReady` callback dan state tracking

```javascript
// BEFORE (BUG)
if (navigationRef.current) {
  setupNotificationHandler(navigationRef.current);
}

// AFTER (FIXED)
const [isNavigationReady, setIsNavigationReady] = useState(false);
useEffect(() => {
  if (isNavigationReady && navigationRef.current) {
    setupNotificationHandler(navigationRef.current);
  }
}, [isNavigationReady]);
```

### 2. package.json - Invalid Dependencies Removed
**Problem:** Dependencies `"install"` dan `"npm"` tidak valid
**Solution:** Dihapus, version updated ke 1.0.0

```json
// REMOVED:
"install": "^0.13.0",
"npm": "^11.6.3",

// UPDATED:
"version": "1.0.0"
```

### 3. NotificationService.js - Null Check Fix
**Problem:** Potential crash jika `data` undefined di grouped notifications
**Solution:** Added null check

```javascript
// BEFORE (BUG)
if (data.productId && data.productName) {

// AFTER (FIXED)  
if (data && data.productId && data.productName) {
```

### 4. notifications.js - SQL Injection Fix
**Problem:** `hoursAgo` parameter di-interpolate langsung ke SQL string
**Solution:** Menggunakan parameterized query

```javascript
// BEFORE (VULNERABLE)
`... datetime('now', 'localtime', '-${hoursAgo} hours')`

// AFTER (FIXED)
`... datetime('now', 'localtime', ? || ' hours')`,
[type, productId, '-' + String(hoursAgo)]
```

### 5. AndroidManifest.xml - Multiple Fixes
- ❌ Removed duplicate CAMERA permission
- ❌ Removed invalid `.DailyCheckService` (tidak ada Java class-nya)
- ❌ Removed invalid `.BootReceiver` (tidak ada Java class-nya)
- ✅ Added proper `react-native-background-fetch` receiver
- ✅ Added `uses-feature` declarations

### 6. file_paths.xml - NEW FILE
**Purpose:** Required untuk FileProvider (camera/gallery)

### 7. proguard-rules.pro - NEW FILE
**Purpose:** ProGuard rules untuk release build nanti

---

## 📱 Build Commands

### Debug APK (untuk testing & distribusi):
```bash
cd android
./gradlew clean
./gradlew assembleDebug
```
**Output:** `android/app/build/outputs/apk/debug/app-debug.apk`

### Release APK (nanti kalau sudah siap):
```bash
cd android
./gradlew assembleRelease
```

---

## 🌐 Distribusi via Website

### Option 1: Direct Download Link
Upload `app-debug.apk` ke hosting kamu, lalu buat link download:

```html
<a href="/downloads/StockWise-v1.0.0.apk" download>
  📥 Download StockWise APK
</a>
```

### Option 2: QR Code
Generate QR code yang mengarah ke link download APK

### Note untuk Users:
- Users perlu enable "Install from Unknown Sources" di Android settings
- APK debug sudah di-sign dengan debug keystore, aman untuk distribusi testing

---

## ⚠️ Troubleshooting

### Error: "SDK location not found"
```bash
echo "sdk.dir=$ANDROID_HOME" > android/local.properties
```

### Error: "Execution failed for task ':app:mergeDebugResources'"
```bash
cd android
./gradlew clean
cd ..
rm -rf node_modules
npm install
```

### Error: Metro bundler crash
```bash
npm start -- --reset-cache
```

### APK tidak bisa di-install
- Pastikan "Install from Unknown Sources" enabled
- Uninstall versi lama dulu jika ada

---

## 📁 Package Contents

```
stockwise-complete-fixes/
├── App.js                          # Fixed navigation timing
├── package.json                    # Cleaned dependencies  
├── README.md                       # This file
├── src/
│   ├── services/
│   │   └── NotificationService.js  # Fixed null check
│   └── database/
│       └── queries/
│           └── notifications.js    # Fixed SQL injection
└── android/
    └── app/
        ├── proguard-rules.pro      # ProGuard rules
        └── src/main/
            ├── AndroidManifest.xml # Fixed permissions
            └── res/xml/
                └── file_paths.xml  # FileProvider paths
```

---

## ✅ Checklist Sebelum Build

- [ ] Backup original files
- [ ] Copy semua fixed files
- [ ] Run `npm install`
- [ ] Pastikan Android SDK terinstall
- [ ] Pastikan JAVA_HOME set ke JDK 17
- [ ] Run `./gradlew clean`
- [ ] Run `./gradlew assembleDebug`
- [ ] Test APK di device

---

**StockWise Mobile v1.0.0**
**Last Updated:** December 2025
