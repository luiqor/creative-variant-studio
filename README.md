# Creative Variant Studio

Desktop app that turns a winning ad script into new hook and on-screen text ideas, and exports them for After Effects.

## Installing

The installers are not signed yet, so macOS and Windows will warn about an unknown developer. This is expected. Follow the steps for your system once.

### macOS

1. Open the `.dmg` file and drag **Creative Variant Studio** into **Applications**.
2. Open it from Applications. macOS says it cannot verify the developer. Click **Done** (or **Cancel**).
3. Open **System Settings → Privacy & Security**, scroll down, and click **Open Anyway** next to "Creative Variant Studio". Confirm with your password.
4. From now on it opens normally.

### Windows

1. Run the installer `.exe`.
2. If Windows SmartScreen says "Windows protected your PC", click **More info**, then **Run anyway**.
3. Open **Creative Variant Studio** from the Start menu.

### First launch: your Gemini token

The first time you open the app it asks for your own Gemini token. Paste it and press **Save token**.

- The token is stored encrypted on this computer and is only used to ask Gemini for ideas.
- To use a different token later, press **Change token** at the top left.
- If Gemini rejects the token, the app brings you back to this screen with a message.

### Building the installers (for the person who makes them)

```
npm install
npm run dist:mac   # macOS .dmg, must be run on a Mac
npm run dist:win   # Windows installer, best run on Windows
```

The installers appear in `dist/`. No token or `.env` file is included.
