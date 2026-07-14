# Step-by-Step Guide: Building & Shipping to Google Play Store

Since Word Frog is built with React Native and Expo, you use **EAS (Expo Application Services)** to compile your code into the Google Play Store binary format (`.aab` - Android App Bundle).

Here is the step-by-step process:

---

## 1. Prerequisites
Ensure you have the EAS CLI tool installed globally and are logged into your Expo account:
```bash
# Install EAS CLI globally if you haven't already
npm install -g eas-cli

# Log in to your Expo account
eas login
```

---

## 2. Before You Build

### Update Local Version Info
Before triggering a production build, update the local version in `constants/version.js` to match your target release version (e.g. `1.0.9`). 

*Note: Since your app performs a remote check against `version.json` to prompt users to update, updating `constants/version.js` now ensures users running the newly downloaded app store version won't see an "Update Available" warning.*

---

## 3. Generate the Production Binary (`.aab`)

You have a pre-configured script in `package.json` for Android production builds. Run it from the root of the project:

```bash
npm run ship-android
```
*Under the hood, this runs: `eas build --platform android --profile production`*

### What happens during the build:
1. **Version Code Auto-Increment**: Since your `eas.json` has `"autoIncrement": true` under the `production` profile, Expo will fetch the previous `versionCode` and automatically increment it. You do not need to manually change `versionCode` in `app.json`.
2. **Credentials Setup**: If this is your first time building this app with EAS, it will ask:
   * *Would you like EAS to generate/manage Android credentials?* -> **Choose Yes (Recommended)**. Expo will handle keystore generation and storage securely.
3. **Queue and Compile**: EAS will upload your code and compile the binary in the cloud. Once complete, it will print a link to download the `.aab` file (Android App Bundle).

---

## 4. Submitting to the Google Play Store

There are two ways to get the compiled `.aab` file onto the Google Play Console:

### Option A: Manual Upload (Simple)
1. Download the `.aab` file from the build completion page in the Expo dashboard.
2. Go to the [Google Play Console](https://play.google.com/console/).
3. Select your app **Word Frog**.
4. Go to **Production** (or **Testing** if you are launching an internal/closed test track first) on the left sidebar.
5. Click **Create new release** at the top right.
6. Drag and drop the downloaded `.aab` file into the upload area.
7. Fill out the release notes, save, and submit for review.

### Option B: Automated Submission (EAS Submit)
You can configure EAS to submit the build directly to Google Play Console.
1. Generate a Google Play Service Account Key (JSON file) on the Google Cloud Console.
2. Link the key to your EAS project configuration:
   ```bash
   eas submit --platform android
   ```
   *EAS will guide you through uploading the service account key. Subsequent submissions will be fully automated.*
