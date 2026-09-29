# UX Pilot context — Jev Courtroom

Paste the **Context** section into UX Pilot, then use the two prompts in **Requests**. All in-game copy is in English — keep it as is.

---

## Context

**Product.** *Jev Courtroom* is a single-player narrative web game. The player is the **defendant** in a murder trial. A prosecutor asks pre-written questions; the player answers in **free text**. While the player types and when they submit, an AI makes the courtroom react **live**: three jurors, the player's defense lawyer and the prosecutor change facial expression. If an answer contradicts the evidence or an earlier statement, the prosecutor raises an **"Objection!"** and points to the proof. After the last question, the jury delivers a verdict.

**Core experience.** Being cross-examined under pressure. You don't have to tell the truth — you only have to stay consistent with the evidence and with what you already said. The player should feel *watched*: the way they type can be read on the jurors' faces.

**Audience.** Adults who enjoy narrative and detective games. Sessions of about 10 minutes. Desktop first (lots of typing), must also work on mobile.

**Case used in the mockup:** *The Verdier Manor Affair*

Situation: "On March 14 at 11:10 PM, you were found in the living room of Verdier Manor, kneeling beside the body of Henri Verdier, your hands covered in blood."

Evidence (exhibits):
| ID | Name | Description |
|---|---|---|
| P1 | Blood on your hands | The blood on your hands belongs to the victim. |
| P2 | Phone call | The victim called you at 10:45 PM. The call lasted 2 minutes. |
| P3 | Witness | The neighbor saw a silhouette leave the manor through the garden around 10:50 PM. |
| P4 | Knife | The weapon was found in the kitchen, with no fingerprints. |
| P5 | Footprints | Muddy size 44 (US 10.5) footprints in the hallway. You wear a size 42 (US 9). |
| P6 | Window | The study window was broken from the inside. |

Prosecutor questions (6):
1. Why were you at the manor that night?
2. What time did you arrive?
3. What did the victim tell you on the phone?
4. How do you explain the blood on your hands?
5. Did you go into the kitchen?
6. Did you see anyone else in the house?

Characters:
- **Marthe** — juror, retiree, sensitive to sincerity and emotion.
- **Karim** — juror, engineer, only believes what fits the facts and the timeline.
- **Léa** — juror, student, suspicious of the prosecution and of stories that are too polished.
- **The Prosecutor** — stays impassive until they sense a flaw, then attacks.
- **Your lawyer** — on the player's side, visibly panics when the player says something that hurts the defense.

**What the main trial screen must contain:**
- The current prosecutor question.
- The three jurors, the prosecutor and the defense lawyer, each with a visible facial expression.
  - Jurors: neutral, convinced, doubt, shocked.
  - Lawyer: neutral, confident, panic.
  - Prosecutor: impassive, suspicious, attacking.
  - Each reaction has an intensity: while the player is typing, reactions are tentative (half strength); after submitting, they are full strength.
- A free-text answer field with an "Answer" button (Enter submits, Shift+Enter adds a new line), and a locked state while the answer is being evaluated.
- Progress through the trial ("Question 2 / 6").
- Access at any time to the case file (the 6 exhibits) and to the player's previous statements.
- Short-lived cues when the court notices how the player types: heavy deleting, long hesitation, typing too fast.
- After submitting: the submitted answer, a possible prosecutor interruption — "Objection!" pointing to a specific exhibit, "Objection!" recalling an earlier statement, or "Answer the question!" — and a "Next question" button.

---

## Requests

### 1. Main trial screen
> Propose a mockup for the main trial screen of this game, desktop (1440×900) plus a mobile version. The question, the characters' faces and the answer field should be visible at the same time without scrolling. Show the screen while the player is typing, and the same screen right after submitting with an "Objection!" on exhibit P5. Propose your own art direction.

### 2. Design system
> Create a design system for this game: color palette, typography, spacing, iconography, and the core components with their states (character card with each expression and intensity, question display, answer field, buttons, exhibit card, statement entry, objection alert, typing cue, progress indicator, case-file panel). Keep it consistent with the trial screen mockup.
