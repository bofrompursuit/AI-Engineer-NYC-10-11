# Curious Cats

React/Vite hackathon prototype with a Game Boy join screen and Peaches learning companion.

## Site-wide Peaches conversation

The bottom-right Peaches panel stays mounted across Join, Welcome, Mission hub, lessons,
Case file, Scan, Gallery, Analytics, and TINY Math Bingo. Learners can type to Peaches
or select **Talk to Peaches** to start a microphone session. Voice starts only after
that choice and microphone permission. The panel keeps its visible transcript
as the learner changes pages. Text uses the server-side Gemini API. Voice uses
an ElevenLabs Agent configured with Gemini. Starting voice passes the recent
visible transcript to the agent as context.
Selecting voice immediately stops Peaches' recorded welcome or Scan greeting,
including a greeting still loading. While voice is starting or active, those
recordings cannot restart. The welcome screen moves straight to its choices.
Peaches receives the current page and challenge summary; Scan photos and join emails
are not sent to the conversation. Bingo stays in its existing page inside an
iframe so the parent Peaches session remains mounted.

To enable text chat, set `GEMINI_API_KEY` and the `TIGER_*` database values in
this checkout's ignored `.env.local`. The shared database enforces one daily
budget across server instances. Without it, Peaches refuses provider requests.
To enable voice, create one private ElevenLabs Agent, choose a Gemini model
for its LLM, allow prompt overrides, and set
`ELEVENLABS_AGENT_ID` and `ELEVENLABS_API_KEY` in this checkout's ignored
`.env.local`. Set `PIP_AGENT_ENABLED=true` after setting the provider limits
below. Restart the dev server after changing values. The server's
`/api/peaches-chat` route calls Gemini for text; `/api/peaches-session` issues a
short-lived WebRTC conversation token for voice. Long-lived keys stay on the
server. The existing recorded greetings still play without these values.
See the ElevenLabs [React SDK](https://elevenlabs.io/docs/eleven-agents/libraries/react)
and [Gemini model setup](https://elevenlabs.io/docs/eleven-agents/customization/llm).

For a noisy room, switch **Noisy room** on in Peaches' panel. The microphone then
stays muted until the learner holds **Hold to speak** with a pointer or the
Space/Enter key. We request browser echo cancellation, noise suppression, and
automatic gain control, and pass the permitted microphone device to the SDK
when the browser exposes its ID. A headset still helps in loud places.
In the ElevenLabs agent's [conversation flow settings](https://elevenlabs.io/docs/eleven-agents/customization/conversation-flow),
start with Patient turn eagerness and test a longer silence timeout (around
10–15 seconds) if Peaches cuts learners off. Keep the agent's first message short,
or let the learner speak first; the recorded intro already welcomes them.
Test with actual background voices and speakers before treating this as
reliable noise handling. The live agent has not yet been configured or tested.

The join email is only a demo check, not authentication. Peaches has a shared UTC
daily cap of 25 Gemini text attempts across `/api/peaches-chat` and `/api/peaches-help`,
and 3 ElevenLabs voice token attempts. Set `PIP_TEXT_DAILY_LIMIT` and
`PIP_VOICE_DAILY_LIMIT` to change these caps, or `0` to disable that provider.
Attempts count even if a provider fails, so the cap stays conservative. Voice
also ends after `PIP_VOICE_MAX_SECONDS` (120 by default), or after 10 seconds
in a hidden tab. This timer runs in the browser and is not a billing guarantee.
The existing per-instance minute guards still limit bursts. For public use,
add real authentication and a deployment-level abuse limit.

Set an independent spending limit in [Google AI Studio billing](https://ai.google.dev/gemini-api/docs/billing/)
for the Gemini project. Its monthly spend cap has billing latency, so it can
overshoot. In ElevenLabs, set the agent's [daily call limit](https://elevenlabs.io/docs/eleven-agents/guides/call-queueing)
to 3 and its [maximum conversation duration](https://elevenlabs.io/docs/eleven-agents/customization/conversation-flow)
to 120 seconds. These provider controls protect against bypassing the browser
timer. Voice usage is billed by connected duration and can include LLM costs;
see [ElevenAgents pricing](https://elevenlabs.io/docs/help-center/product/eleven-agents/how-much-does-eleven-agents-cost).
The app limits count requests, not dollars. Live ElevenLabs and Gemini
conversations are not yet verified.

> The **Scan** tab (photo → Gemini vision quiz → Nimble articles → Tiger Data gallery) has its
> own integration notes in [`SCAN.md`](SCAN.md).

## Peaches flow

1. Open `?view=join`, enter a valid email, and press A. This is a demo email check, not authentication or account creation.
2. Peaches' models, matching still render, and both greeting clips preload in the background during join. Press A again to meet Peaches. The floating still crossfades into the first rendered 3D frame; Peaches then waves and speaks. The enter gesture prepares sound before the delayed greeting. Hear Peaches is available throughout, and Skip opens the journey choices. Sound and voice preferences are saved in browser local storage.
3. Choose A: Physics, B: Calculus, or C: Biopharma Cyber Detective. Each starter journey has three authored questions with answer validation, hints, and explanations.
4. Peaches remains in the corner. Correct answers trigger short confetti; finishing all three challenges triggers rockets. Reduced motion disables these animations. XP earned in a journey is a local demo display; the existing dashboard metrics remain sample data.

The supplied GLBs are in `public/models`. `public/images/peaches-loading.png` is a transparent render of the neutral GLB using the live camera and lighting. It stays visible if WebGL or model loading fails. The two short greeting clips are in `public/audio`, generated with these ElevenLabs voices:

- Male: Liam (`TX3LPaxmHKxFdv7VOQHJ`)
- Female: Jessica (`cgSgspJ2msm6clMCkdW9`)

Greeting: “Hey, I'm Peaches! Ready to learn something new? Pick an adventure. I'll be right here if you need a hand. Let's go!” No runtime ElevenLabs key is needed for these clips. Generated free-form answers currently use text, not synthesized speech.

## Development and checks

Use Node 22+ (verified with Node 24) and pnpm:

1. Copy the environment template from the repository root:

   ```sh
   cp .env.example .env.local
   ```

2. Open `.env.local` and fill in `GEMINI_API_KEY` for image quizzes and Peaches
   text chat. Add `NIMBLE_API_KEY` for related articles and the `TIGER_*`
   connection values for scan storage, the gallery, and Peaches' shared daily cap.
   The template explains the optional settings. Peaches'
   bundled greeting clips work without an ElevenLabs key.
3. Install dependencies and start the development server with the commands below.
   Restart it after changing environment values. `.env.local` is ignored by Git;
   `.env.example` contains empty credential fields and is safe to share.

```sh
pnpm install
pnpm dev
pnpm exec tsc --noEmit
pnpm test
pnpm build
```

Vite defaults to port 8443. It serves `/api/peaches-chat` and `/api/peaches-session`
locally. Built-in hints and explanations work without provider keys. The older `/api/peaches-help` Vercel route
remains in the repository but is no longer used by the Peaches panel.

## Curious Cats Pro (RevenueCat Web Billing)

Physics is free. Calculus, the Biopharma case (Forensic Biochem) and TINY Math Bingo (Algebra Arcade) open only with the RevenueCat `pro` entitlement, sold through the current offering's packages with Web Billing (`@revenuecat/purchases-js`). Set `VITE_REVENUECAT_API_KEY` to the project's public Web Billing key (`rcb_…`); with no key the paywall is off and every journey stays open. Learners get an anonymous RevenueCat ID saved in local storage, so the demo join email is never sent to RevenueCat. The SDK loads only when a premium journey opens. If RevenueCat can't be reached, the journey shows an error and Physics stays playable.

## Older lesson Q&A route

Set `GEMINI_API_KEY` on the server, never as a `VITE_` variable. Optional `GEMINI_MODEL` overrides the default `gemini-3.5-flash-lite`. Set `PIP_HELP_ENABLED=false` to disable provider requests. The route uses Google's [generateContent API](https://ai.google.dev/api/generate-content) and the [current model list](https://ai.google.dev/gemini-api/docs/models).

The client sends the learner's question, journey/question identifiers, and whether the challenge was solved. It does not send the join email. The server loads the authored context, asks for concise hints, and calls Gemini with a 12-second timeout. It returns no invented fallback answers. Provider failures leave the authored hints available.

The demo limits input to 600 characters and provider output to 400 tokens, with a per-instance eight-request/minute guard. This route shares Peaches' 25-attempt UTC daily text cap. The curriculum and grading are client-visible demo data, not secure assessments. Sign-in, account persistence, live dashboard metrics, and live Gemini answers have not been verified.

## Acceptance checks

- QR opens the join route; invalid email stays on join; reset clears the entered player.
- Enter opens the welcome, both voices play, mute and skip work, and all three choices lead to the matching journey.
- Wrong answers do not advance or celebrate. Correct answers celebrate once and unlock the next challenge. Completing a journey celebrates and returns to the hub.
- Help follows the current question; authored hints work without a provider; unavailable live Q&A is clearly reported.
- Verify narrow/wide layouts, keyboard focus, reduced motion, and model/audio loading failures.

API tests mock Gemini to check invalid requests, missing configuration, failure handling, trusted lesson context, and rate limiting. They do not prove live provider access or teaching quality.

### Verified locally on October 11, 2026

- Join, invalid email, both greeting voices, saved voice preference, mute, replay, skip, and all three journey routes.
- All nine questions through completion; wrong-answer retry; confetti and rockets with normal motion.
- Contextual hints, unavailable live Q&A, and Escape closing help with focus returned to Peaches.
- Desktop (1280 × 900) and phone (390 × 844) layouts. The phone lesson scrolls above Peaches without covering the answer controls. Reduced motion hides celebrations and holds Peaches still.
- TypeScript, six API tests, and production build. The lazy Three.js chunk triggers Vite's size warning.

The local loading update was also checked with slow network simulation, blocked model downloads, blocked audio downloads followed by replay recovery, both voices, mute/replay, and reduced motion. The corner avatar reuses the preloaded models without new model requests.

Live Gemini and real authentication remain unverified.

### Local Peaches motion update

- Peaches uses the Blender facial controls for blinks and happy eyes, and floats and sways while idle. The yellow base stays stationary.
- Greeting playback blends closed, open, and round mouth shapes and small arm gestures from the actual audio amplitude. Both voice clips use the same analyser; mute, stop, and playback completion disconnect it. This is an approximation of talking, not phoneme lip sync.
- Correct answers and completion trigger a bounce, raised arms, happy eyes, and a wider smile. Incorrect answers trigger a gentle nod, a small smile, and the label "You've got this!". Repeated answer checks restart the reaction, and old reactions do not follow Peaches to a different question.
- Pending help requests trigger a thinking tilt. Greeting and help waves play once, with a short blend into and out of the existing clip.
- Reduced motion holds Peaches in a neutral pose while keeping audio and text feedback available. Hidden tabs pause visual updates.

The active models are `public/models/peaches-neutral-expressions.glb` and `public/models/peaches-hover-wave-expressions.glb`. The original model files are preserved. The new exports retain the exact neutral geometry, materials, transforms, and existing wave animation, so the loading still remains a match. Their matching object hierarchies allow the wave clip to animate the neutral model while facial controls change independently. Named controls are resolved from each mesh's dictionary; eye and mouth weights are blended within their groups with totals at most 1. Motion values live in `src/peachesMotion.ts`; reaction durations live in `src/peachesBehavior.ts`.

The two greeting MP3s and loading PNG are excluded from Git LFS in `.gitattributes`. These small runtime assets are stored as their original bytes so a regular checkout and static build include usable files without an LFS download step.

Checked locally before the Blender handoff: both greeting voices, mute and replay, a full Physics journey with wrong-answer retry and completion, thinking with a mocked help response, desktop and 390-pixel phone layouts, and reduced motion. A temporary browser probe confirmed a changing audio signal during playback and zero after stop. TypeScript and the production build passed.

After the Blender handoff, checks with the actual exports passed for named controls, speech deformation, happy blinks, facial group totals, unchanged neutral geometry, independent cloned weights, simultaneous wave and speech, stationary base, and reduced-motion recovery. The browser loaded both new GLBs at their expected sizes; both voices, mute, retry, correct-answer smiles, and journey completion worked. Happy eyes and the smile were checked in the 390 × 844 phone layout with no horizontal overflow or overlap with answer controls. Reduced motion hid celebrations and kept Peaches neutral. TypeScript and the production build passed; the existing Three.js chunk warning remains.

Live Gemini remains unverified.
