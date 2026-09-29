# UX Pilot context — Jev Courtroom

Paste the **Global context** block into UX Pilot first (project context / design brief), then generate each screen with its own prompt from **Screens**. All in-game copy is in English — keep it as is.

---

## 1. Global context (paste once)

**Product.** *Jev Courtroom* is a single-player narrative web game. The player is the **defendant** in a murder trial. A prosecutor asks pre-written questions; the player answers in **free text**. While the player types and when they submit, an AI (Jev, a decision model returning probabilities) makes the courtroom react **live**: three jurors, the player's defense lawyer and the prosecutor change facial expression. If the answer contradicts the evidence or an earlier statement, the prosecutor shouts **"Objection!"** and brandishes the proof. After the last question, the jury deliberates and delivers a verdict, with a recap showing how each juror's opinion evolved.

**Core fantasy.** Being cross-examined under pressure. You don't have to tell the truth — you only have to stay consistent. The UI must make the player feel *watched*: every keystroke can be read on the jurors' faces.

**Audience.** Adults who like narrative / detective games (Ace Attorney, Her Story, L.A. Noire, Return of the Obra Dinn). Sessions of ~10 minutes. Desktop first (lots of typing), must also work on mobile.

**Tone & art direction (recommended).** *Modern noir courtroom.* Dark, cinematic, tense, elegant — not cartoonish, not corporate.
- Palette: near-black warm charcoal backgrounds (#141210 / #1E1A17), aged-wood browns (#5A3E2B), parchment text (#F1E9DD), muted secondary text (#A89C8A), a single brass/gold accent (#D9A441) for primary actions and exhibit IDs, blood red (#C8423B) reserved for objections and "Guilty", a desaturated green (#6FA46B) reserved for "Not guilty" / convinced.
- Typography: a high-contrast serif for titles and dialogue (e.g. Playfair Display / Cormorant), a clean sans for UI (e.g. Inter), a monospace or typewriter face for exhibit IDs and case-file details (e.g. IBM Plex Mono / Special Elite).
- Materials: subtle wood grain, paper/case-file textures, soft spotlight vignettes, film grain. Case file looks like a real manila folder with typed index cards and paper-clipped exhibits.
- Characters: illustrated **bust portraits** (semi-realistic, painterly or clean graphic-novel style), consistent lighting, each with distinct expressions (see §3). Currently the app uses emoji placeholders — design with real portraits.
- Motion: expressions cross-fade and slightly scale with intensity; objections are a full-width impact moment (screen shake, red flash, big slanted type).

**Layout principle.** The courtroom is the stage, the text box is the player's "voice". The question, the characters' faces and the answer field must all be visible at once, without scrolling, on a 1440×900 screen.

**Accessibility.** WCAG AA contrast, every expression also conveyed by a small text label/icon (not color only), full keyboard play (Enter = submit, Shift+Enter = new line), reduced-motion variant for objections.

---

## 2. Game content (real data to use in mockups)

**Case:** *The Verdier Manor Affair*

**Situation:** "On March 14 at 11:10 PM, you were found in the living room of Verdier Manor, kneeling beside the body of Henri Verdier, your hands covered in blood."

**Evidence (exhibits P1–P6):**
| ID | Name | Description |
|---|---|---|
| P1 | Blood on your hands | The blood on your hands belongs to the victim. |
| P2 | Phone call | The victim called you at 10:45 PM. The call lasted 2 minutes. |
| P3 | Witness | The neighbor saw a silhouette leave the manor through the garden around 10:50 PM. |
| P4 | Knife | The weapon was found in the kitchen, with no fingerprints. |
| P5 | Footprints | Muddy size 44 (US 10.5) footprints in the hallway. You wear a size 42 (US 9). |
| P6 | Window | The study window was broken from the inside. |

**Prosecutor questions (6):**
1. Why were you at the manor that night?
2. What time did you arrive?
3. What did the victim tell you on the phone?
4. How do you explain the blood on your hands?
5. Did you go into the kitchen?
6. Did you see anyone else in the house?

**Cast:**
- **Marthe** — juror, retiree, sensitive to sincerity and emotion.
- **Karim** — juror, engineer, only believes what fits the facts and the timeline.
- **Léa** — juror, student, suspicious of the prosecution and of stories that are too polished.
- **The Prosecutor** — impassive until they smell a flaw, then attacks.
- **Your lawyer** — on your side, visibly panics when you say something that hurts your defense.

---

## 3. Components & states

**Character card (juror / lawyer / prosecutor).** Portrait, name, role, current expression label. Expression has an **intensity 0–1**: previews while typing are shown at half strength (softer, semi-transparent glow), final reactions at full strength.
- Jurors: `neutral`, `convinced` (green glow, slight lean in), `doubt` (amber, raised eyebrow), `shocked` (red, wide eyes).
- Lawyer: `neutral`, `confident`, `panic` (sweat, hand on forehead).
- Prosecutor: `impassive`, `suspicious` (narrowed eyes), `attacking` (pointing finger — used during objections).

**Prosecutor speech bubble.** The current question, displayed as dialogue (large serif, typewriter reveal).

**Answer box.** Multi-line text area ("Your answer…"), "Answer" button, hint "Enter to answer · Shift+Enter for a new line". States: empty, typing, evaluating (locked, subtle pulse "The court is listening…"), disabled.

**Live typing reactions.** Short-lived cues triggered by how the player types, shown as tiny indicators near the faces or the text box:
- *Heavy deleting* (≥15 chars erased at once) → jurors doubt, lawyer panics, prosecutor suspicious.
- *Long hesitation* (5 s idle) → jurors doubt, prosecutor suspicious.
- *Rushing* (typing very fast) → prosecutor suspicious.

**Objection banner** (3 variants, only after submit):
- "Objection!" + exhibit card (e.g. "Exhibit P5 — Footprints: …") — the case file opens and highlights that exhibit.
- "Objection!" + recalled statement ("Earlier, when asked '…', you said: '…'").
- "Answer the question!" (warning variant, amber instead of red).

**Case file (evidence drawer).** Always accessible via a "Case file (6)" tab. Side drawer on desktop, bottom sheet on mobile. List of exhibit cards (ID badge, name, description). Can highlight one exhibit.

**Statement history.** The player's previous answers (question + answer), useful to stay consistent — accessible from the case file or a "Your statements" tab.

**Progress.** "Question 3 / 6", ideally as 6 steps/gavel marks.

---

## 4. Screens (one prompt each)

### Screen 1 — Intro / case briefing
> Cinematic intro screen for a noir courtroom game. Large serif title "The Verdier Manor Affair". Below, the situation paragraph as a dramatic opening narration. Then a manila case-file section "Evidence known to the court" with 6 exhibit index cards (P1–P6, gold monospace ID badge, name, one-line description). A muted italic rule reminder: "You don't have to tell the truth — but your story must never contradict the evidence or your own previous statements. The jury is watching." One primary brass button "Enter the courtroom". Dark warm background, spotlight vignette, film grain.

### Screen 2 — Trial, answering (main screen)
> Main gameplay screen, 1440×900, dark cinematic courtroom. Top bar: case title left, progress "Question 2 / 6" as 6 steps right, "Case file (6)" tab button. Upper area: the jury box — three juror bust portraits side by side on a wooden bench (Marthe, Karim, Léa), each with name and a small expression label. Middle: the prosecutor portrait on the left with a large speech bubble containing the question "What time did you arrive?", and the defense lawyer portrait on the right, smaller. Bottom: the player's answer box, wide, like a witness-stand microphone area, with textarea "Your answer…", brass "Answer" button and keyboard hint. Everything visible without scrolling.

### Screen 3 — Trial, live reaction while typing
> Same main screen, while the player is typing a partial answer. Jurors show soft, half-intensity reactions: Marthe neutral, Karim "doubt" (subtle amber glow), Léa "convinced" (subtle green glow). A small typing-event toast near the answer box: "Long hesitation — the jury noticed." The prosecutor has narrowed "suspicious" eyes. Convey that reactions are tentative (lower opacity, soft glows).

### Screen 4 — Objection!
> Same courtroom, full-strength dramatic moment after submit. A huge slanted red "OBJECTION!" banner slams across the screen (comic-impact style but elegant, noir). The prosecutor portrait is "attacking", pointing. The case file drawer slides open on the right with exhibit "P5 — Footprints: Muddy size 44 (US 10.5) footprints in the hallway. You wear a size 42 (US 9)." highlighted with a red border and paper-clip. Jurors: two "shocked", one "doubt". Lawyer "panic". Below, the player's submitted answer in italic quotes, and a "Next question" button.

### Screen 5 — Objection on an earlier statement / "Answer the question!"
> Variant of the objection screen: the banner recalls an earlier statement — "Earlier, when asked 'Why were you at the manor that night?', you said: 'I was never called by Henri.'" shown as a torn transcript slip. Second variant: amber "Answer the question!" banner, less violent, prosecutor irritated.

### Screen 6 — Case file & statements drawer
> Right-side drawer styled as an open manila folder. Two tabs: "Evidence (6)" and "Your statements (2)". Evidence tab: typed index cards P1–P6 with gold IDs. Statements tab: transcript-style list of question/answer pairs. Close button. Mobile variant: bottom sheet.

### Screen 7 — Deliberation transition
> Short interstitial: dim courtroom, the three juror silhouettes turn away, text "The jury deliberates…" with a slow gavel/loader animation.

### Screen 8 — Verdict & recap
> Verdict screen. Huge centered verdict word: "Not guilty" in muted green (or "Guilty" in blood red variant). Subtitle "2 of 3 jurors voted not guilty". Below, three juror cards side by side: portrait, name, vote ("Votes not guilty"), conviction score (e.g. 3.42 / 5), a small line chart of their conviction across the 6 questions with a dashed threshold line at 3, red dots where an objection happened, a highlighted "turning point" dot. Under each chart: "Turning point — 'How do you explain the blood on your hands?': 'I tried to stop the bleeding.'" Primary button "New trial". This screen should show off how the AI read the player.

### Screen 9 — Loading & error
> Loading: "Loading case…" with a gavel or typewriter animation. Error: "Could not reach the court" with a retry button, same noir style.

---

## 5. Alternative art directions (if the noir one doesn't fit)

- **Visual-novel / anime** (Ace Attorney-like): bright, expressive 2D characters, bold colors, speech boxes at the bottom, big comic objection bubble. More playful.
- **Minimal editorial**: light paper background, black serif type, flat line-art portraits, red accent only. Feels like a New Yorker illustration; clean and modern.
- **Retro pixel art**: 16-bit courtroom, pixel portraits with 4 expressions each, CRT effects. Cheap to produce art for, very readable.

## 6. Technical constraints for the export

- React + plain CSS in the app (no UI library); design tokens as CSS variables are ideal.
- Character portraits: one image per character × expression (jurors: 4, lawyer: 3, prosecutor: 3), same framing and size so they can cross-fade.
- The reaction intensity (0–1) is a continuous value: design how 0.5 vs 1.0 looks (glow opacity, scale, desaturation).
