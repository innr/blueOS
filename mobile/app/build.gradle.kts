plugins { id("com.android.application"); kotlin("android") }

android { namespace = "com.blueos.audiobook"; compileSdk = 35
    defaultConfig { applicationId = "com.blueos.audiobook"; minSdk = 26; targetSdk = 35; versionCode = 1; versionName = "0.1.0" }
}
