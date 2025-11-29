# StockWise Mobile ProGuard Rules
# For future release builds

# React Native
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.jni.** { *; }

# SQLite
-keep class org.pgsqlite.** { *; }
-keep class net.sqlcipher.** { *; }

# Notifee
-keep class app.notifee.** { *; }

# Background Fetch
-keep class com.transistorsoft.rnbackgroundfetch.** { *; }

# Vision Camera
-keep class com.mrousavy.camera.** { *; }

# Image Picker
-keep class com.imagepicker.** { *; }

# React Native SVG
-keep class com.horcrux.svg.** { *; }

# Async Storage
-keep class com.reactnativecommunity.asyncstorage.** { *; }

# Gesture Handler
-keep class com.swmansion.gesturehandler.** { *; }

# Screens
-keep class com.swmansion.rnscreens.** { *; }

# Keep native methods
-keepclassmembers class * {
    native <methods>;
}

# Keep Parcelables
-keep class * implements android.os.Parcelable {
    public static final android.os.Parcelable$Creator *;
}

# OkHttp
-dontwarn okhttp3.**
-dontwarn okio.**

# Attributes
-keepattributes Signature
-keepattributes *Annotation*
