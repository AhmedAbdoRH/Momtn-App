# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.

# --- React Native Core ---
-keep class com.facebook.react.bridge.CatalystInstanceImpl { *; }
-keep class com.facebook.react.bridge.WritableNativeArray { *; }
-keep class com.facebook.react.bridge.WritableNativeMap { *; }
-keep class com.facebook.react.bridge.ReadableNativeArray { *; }
-keep class com.facebook.react.bridge.ReadableNativeMap { *; }
-keep class com.facebook.react.bridge.Arguments { *; }
-keep class com.facebook.react.bridge.Callback { *; }
-keep class com.facebook.react.bridge.JavaScriptModule { *; }
-keep class com.facebook.react.bridge.NativeModule { *; }
-keep class com.facebook.react.bridge.ReactContext { *; }
-keep class com.facebook.react.bridge.ReactMethod { *; }
-keep class com.facebook.react.bridge.ReadableArray { *; }
-keep class com.facebook.react.bridge.ReadableMap { *; }
-keep class com.facebook.react.uimanager.ViewManager { *; }
-keep class com.facebook.react.uimanager.ThemedReactContext { *; }
-keep class com.facebook.react.uimanager.annotations.ReactProp { *; }
-keep class com.facebook.react.uimanager.annotations.ReactPropGroup { *; }
-keep class com.facebook.react.module.annotations.ReactModule { *; }
-keep class com.facebook.react.fabric.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }
-keep class com.facebook.react.internal.featureflags.** { *; }

# --- Hermes Engine ---
-keep class com.facebook.hermes.unicode.** { *; }
-keep class com.facebook.jni.** { *; }
-keep class com.facebook.soloader.** { *; }

# --- JNI & Native Libraries ---
-keepattributes Signature, *Annotation*, EnclosingMethod, InnerClasses
-keepclassmembers class * {
  @com.facebook.react.bridge.ReactMethod *;
  @com.facebook.proguard.annotations.DoNotStrip *;
  @com.facebook.proguard.annotations.KeepGettersAndSetters *;
}

# Keep all React Native native methods and classes
-keep class com.facebook.react.** { *; }
-keep interface com.facebook.react.** { *; }
-keep class com.facebook.soloader.** { *; }
-keep class com.facebook.yoga.** { *; }
-keep class com.facebook.jni.** { *; }

# Specific for feature flags in RN 0.81
-keep class com.facebook.react.internal.featureflags.** { *; }
-dontwarn com.facebook.react.internal.featureflags.**

# --- Firebase & Google Play Services ---
-keep class com.google.firebase.** { *; }
-keep class com.google.android.gms.** { *; }
-dontwarn com.google.firebase.**
-dontwarn com.google.android.gms.**

# React Native Firebase
-keep class io.invertase.firebase.** { *; }
-dontwarn io.invertase.firebase.**
-dontwarn com.google.firebase.**

# --- Networking (OkHttp/Okio/Retrofit) ---
-keep class okhttp3.** { *; }
-keep interface okhttp3.** { *; }
-dontwarn okhttp3.**
-keep class okio.** { *; }
-dontwarn okio.**
-keep class com.fasterxml.jackson.** { *; }

# --- Supabase & Other JSON/Serialization ---
-keep class com.google.gson.** { *; }
-keep class org.json.** { *; }
-keep class com.facebook.react.bridge.ReadableMap { *; }
-keep class com.facebook.react.bridge.ReadableArray { *; }
-keep class com.facebook.react.bridge.WritableMap { *; }
-keep class com.facebook.react.bridge.WritableArray { *; }

# --- Supabase & PostgREST ---
-keep class com.supabase.** { *; }
-dontwarn com.supabase.**

# --- Common React Native Modules ---
-keep class com.swmansion.reanimated.** { *; }
-keep class com.swmansion.gesturehandler.** { *; }
-keep class com.facebook.react.animated.** { *; }
-keep class com.swmansion.rnscreens.** { *; }
-keep class com.th3rdwave.safeareacontext.** { *; }
-keep class com.oblador.vectoricons.** { *; }
-keep class app.notifee.** { *; }
-keep class com.imagepicker.** { *; }
-keep class com.rnfs.** { *; }
-keep class com.reactnativegooglesignin.** { *; }

# --- Kotlin Coroutines & Standard Library ---
-keep class kotlinx.coroutines.** { *; }
-keep class kotlin.reflect.jvm.internal.** { *; }
-dontwarn kotlin.**
-dontwarn kotlinx.**

# --- Maintenance ---
-keepattributes SourceFile,LineNumberTable
-dontwarn javax.annotation.**
-dontwarn javax.inject.**
-dontwarn sun.misc.Unsafe
-dontwarn com.facebook.react.devsupport.**

# Prevent R8 from removing vital parts of your app's main classes
-keep class com.myapp1reactnative.** { *; }
