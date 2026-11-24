import time
import re
import subprocess
import os

gradle_path = 'android/app/build.gradle'

# 1. Generate unique version code using current epoch time (seconds since 1970)
# Dividing by 10 ensures it is under the 2,147,483,647 limit of 32-bit signed integer.
epoch_sec = int(time.time() / 10)
version_code = epoch_sec
version_name = f"1.0.{epoch_sec}"

print(f"Bumping version code to: {version_code}")
print(f"Bumping version name to: {version_name}")

# 2. Read and modify build.gradle
with open(gradle_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace versionCode
content = re.sub(r'versionCode \d+', f'versionCode {version_code}', content)
# Replace versionName
content = re.sub(r'versionName "[^"]+"', f'versionName "{version_name}"', content)

with open(gradle_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("build.gradle updated successfully.")

# 3. Build Web Assets
print("Bundling web assets with Vite...")
subprocess.run("npx vite build", shell=True, check=True)

# 4. Sync with Capacitor
print("Syncing with Capacitor...")
subprocess.run("npx cap sync android", shell=True, check=True)

# 5. Compile Android App using Gradle
print("Compiling Android package using Gradle...")
env = os.environ.copy()

# Auto-detect JAVA_HOME if missing or invalid
if "JAVA_HOME" not in env or not os.path.exists(env.get("JAVA_HOME", "")):
    silabs_java = r"C:\Users\user\.silabs\slt\installs\archive\energy_profiler-v6.0.99\features\com.silabs.external.java21.windows.x86_64.feature_21.0.5\jre"
    std_java = r"C:\Program Files\Android\Android Studio\jbr"
    if os.path.exists(silabs_java):
        env["JAVA_HOME"] = silabs_java
    elif os.path.exists(std_java):
        env["JAVA_HOME"] = std_java

# Auto-detect ANDROID_HOME if missing or invalid
if "ANDROID_HOME" not in env or not os.path.exists(env.get("ANDROID_HOME", "")):
    std_android = os.path.expanduser(r"~\AppData\Local\Android\Sdk")
    if os.path.exists(std_android):
        env["ANDROID_HOME"] = std_android

# Prevent AGP AndroidLocationsException due to conflicting env variables
env.pop("ANDROID_PREFS_ROOT", None)
env.pop("ANDROID_SDK_HOME", None)

# Run Gradle build in the android subfolder
# Stop any incompatible background Gradle daemons
subprocess.run(r".\gradlew.bat --stop", shell=True, cwd="android", env=env)

# Run Gradle build in the android subfolder
subprocess.run(r".\gradlew.bat assembleDebug", shell=True, check=True, cwd="android", env=env)

# 6. Copy APK to vihara-band.apk
import shutil
src_apk = r"android/app/build/outputs/apk/debug/app-debug.apk"
dst_apk_dir = r"android/app/build/outputs/apk/debug/vihara-band.apk"
dst_apk_root = r"vihara-band.apk"

if os.path.exists(src_apk):
    shutil.copy(src_apk, dst_apk_dir)
    shutil.copy(src_apk, dst_apk_root)
    print(f"Copied APK to: {dst_apk_root} and {dst_apk_dir}")

print("\nBUILD SUCCESSFUL!")
print(f"New APK (vihara-band.apk) with Version Code {version_code} ready!")
