# Unfold

React and Vite hackathon demo with a Pip welcome screen. A new visitor sees Pip before the mission hub. The direct `?view=join` link still opens the QR join screen.

## Pip intro

- The neutral and wave GLB files in `public/models/` are the supplied Blender exports. Pip waves when hovered or focused.
- The voice choice is saved in the browser's local storage. The intro appears once per browser session and can be reopened with **Meet Pip** in the header.
- Voice previews use the ElevenLabs voice IDs supplied for Pip. The browser calls `api/pip-voice.js`, which sends only a fixed preview script to ElevenLabs. The API key stays on the server.

Set `ELEVENLABS_API_KEY` in the Vercel project environment for voice previews. Use a key from the ElevenLabs workspace that owns both Pip voices. If the key is absent or ElevenLabs fails, the intro remains usable and shows a preview error. The Vite development server does not run the Vercel API function, so previews require a Vercel environment or a local function runner.

## Local checks

```sh
pnpm install
pnpm exec tsc --noEmit
pnpm build
pnpm dev
```

Vite 8 needs Node 20.19+ or 22.12+.
