<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/ae4a7de0-7868-422e-8554-103c23251abf

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Rebuilding after source changes

The Android project contains a previously generated web bundle under `android/app/src/main/assets/public`. After changing React/TypeScript source, rebuild and sync that bundle before producing a new APK:

```bash
npm ci
npm run lint
npm run build
npx cap sync android
```

Then build the APK from the Android project. Do not distribute an APK built from the old bundled assets.

## Notes on the maintenance patch

See `PATCH_NOTES_BN.md` for the fixes and the checks that could not be completed in this environment.
