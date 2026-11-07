# Creative Variant Studio

Desktop app that turns a winning ad script into new hook and on-screen text ideas, and exports them for After Effects.

## Installing

Download the latest installer from the [Releases page](https://github.com/luiqor/creative-variant-studio/releases/latest): the `.dmg` for macOS (`arm64` for Apple Silicon, the other one for Intel) or the `.exe` for Windows.

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

## Using it

1. Paste a winning script (see `examples/`), choose idea types (hook and on-screen text by default; add your own, e.g. CTA), the number of ideas and an optional note, then press **Generate**.
2. **Keep** or **Reject** cards, reorder the Kept lists by drag and drop, or open "⋯" → **More like this**. Hover a card to see it in a 9:16 frame.
3. Export: **AE script** (`.jsx`) for After Effects, or CSV / JSON from the secondary menu.

## Success metrics

Pilot: 1–2 designers, 2 weeks, compared with the manual process and with a browser AI chat.

| Metric | Now | Target | Source |
|---|---|---|---|
| Designer time per modification | ≈ 3 h | −20…50% | designers' self-report or task tracker |
| Modifications per month | ≈ 240 | 300…480 | team report, after rollout (not measurable in 2 weeks) |
| Share of cards Kept | no data | recorded in the pilot, threshold set after it | `events.jsonl` |
| Share of cards with feedback | no data | recorded in the pilot | `events.jsonl` |
| ROMI of modifications made with the tool | 140% | not below 125% | UA reports |

The app appends events to `events.jsonl` in its user data folder (no UI to export it yet; designers send the file). Join the files with `cat` and run `npm run metrics -- <file>`.

## Next iteration

1. A menu item to open or save `events.jsonl`.
2. Import a creative instead of pasting the script (format not decided) and analyse the script automatically: split it into hook, problem, demo, CTA and suggest idea types.
3. Questions from the model after "More like this".
4. A diversity filter: tag each idea with an angle (pain, humor, fear, social proof) and remove duplicates.
5. Tune brand tone and length limits on real SockLock scripts.
6. Meta policy checks for the texts.
7. History and feedback from ad results (a Meta CSV).
8. Code signing of the installers.

## Building the installers (for the person who makes them)

```
npm install
npm run dist:mac   # macOS .dmg, must be run on a Mac
npm run dist:win   # Windows installer, best run on Windows
```

The installers appear in `dist/`. No token or `.env` file is included.
