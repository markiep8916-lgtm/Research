# VOIDPATH: writers' bible

> *"Sleep is not death. Sleep is shelter."* (WARDEN)
> *"Then we'll build a world worth waking for."* (KADE)

This is the bible every dialogue writer follows from Wave C on. `STORY.md` says what happens;
this file says how it sounds, what is true, where every scene lives and how long it may run.
`TECH_PLAN.md` stays binding for ids, flags, encounters, spawns and budgets; this file uses them and
never renames them.

**Ownership.** Task W wrote this file. Gate directors G2 and G3 may amend it for later chapters, and
I2b owns it in Wave I. Location owners do not edit it: if a proposal here does not fit your maps,
implement the closest version and say so in your milestone report.

**How binding is each part?**

| Mark | Meaning |
|---|---|
| **FIXED** | A line quoted in `STORY.md` or `TECH_PLAN.md`. Use it word for word (you may split it across consecutive boxes). |
| **B** | An id named in `TECH_PLAN.md` (script, flag, encounter, spawn, anchor, objective). Binding. |
| **K** | A key scene (`key: true` in `scenes`): staging rules of TECH_PLAN 11.3 apply. |
| (no mark) | A proposal from this bible: script ids, trigger ids, local flags, objective ids and lines. Owners use these ids so that other owners, the gates and the transcripts line up; owners write the final text. |

Contents: 1 House style. 2 Voice sheet. 3 Canon. 4 Callbacks. 5 Scene inventory. 6 Party Talks.
7 Driftmarket NPC roster. 8 The hub and the world reacting. 9 Tips, BOLT hints, objectives,
recaps. 10 Credits. 11 Binding script id checklist.

---

## 1. House style

### 1.1 The box

- **At most 100 visible characters per box** (the dry run fails above it; `*emphasis*` markers do
  not count). Aim for 90. A scene's average should sit at or below 80, or it will not fit its time.
- **One idea per box.** If a line has an "and" in the middle, it is probably two boxes.
- Reading time per box, as the dry run estimates it: 1.2 s plus 1 s per 18 characters. A 60-character
  box costs about 4.5 s, a 90-character box about 6 s. WARDEN's text reveals at 0.6x speed: give it
  fewer, shorter boxes.
- Short lines. Let silence do work: a narration box, a pose, a camera move or a two-second wait often
  says more than a sentence.

### 1.2 Line format quick reference

```js
await cs.say('SERA', 'Pod 2271. My brother. If anything\'s happened to him...', { expr: 'sad' });
await cs.say([
  { speaker: 'KADE', text: 'Easy. You were under for 412 days.' },
  { speaker: 'BOLT', text: 'Every pod on this deck says *REVIVAL DEFERRED*. Except yours.', expr: 'worried' },
  { speaker: 'BOLT', text: 'Hit its *weakness* to crack its shield.', tag: 'mech' },   // mechanics box
  { speaker: 'RUSE', text: 'Girl. It\'s late.', offscreen: true },                   // radio, voice in a dream
]);
await cs.narrate('The recording loops. Ines raises a hand to the lens, and it begins again.');
const pick = await cs.choice('', ['Stay.', 'Wake up.'], { speaker: 'KADE', cancelIndex: 1 });
```

- Speaker names are the registered upper-case names (section 2.8). Party speakers (KADE, NYX, ORION,
  SERA) must be visible when they speak: gather them, or mark the line `offscreen: true` (radio,
  dream voices only).
- A `cs.choice` prompt shows as a box and counts toward budgets; an empty prompt `''` does not. Choice
  options are short (under 30 characters) and in the chooser's voice.
- `tag: 'mech'` marks a mechanics box. At most 3 of them before the first battle of the game (they all
  belong to `prologue.tutorial`). Tips inside battles are not script boxes and are not tagged.
- Expressions: travelers, VOSS, RUSE, THEO have `neutral smile sad determined surprised`. BOLT has eye
  variants `happy worried determined`. HALCYON has `calm flicker`. Unknown expressions fall back to
  neutral with a warning, so stick to these.

### 1.3 Spelling, punctuation, names

- Plain ASCII only: straight quotes `'` and `"`, three dots `...` for trailing off and for being cut
  off. No em dashes, no curly quotes, no emoji. Escape apostrophes in single-quoted strings.
- **Case tells you who is meant.** `the Halcyon` is the ship; `HALCYON` is her mind. `WARDEN` is the
  Halcyon's other half. Ringborn speak of `the Warden` (title case) for the Meridian's mind and for
  wardens in general ("If your Warden's the same as ours"), and of `the Lock` in their legend.
  Machine minds are always upper case in text: BOLT, HALCYON, WARDEN, MOTHER-7, ECHO. People are
  title case in text (Kade, Nyx, Ruse, Theo) and upper case only in the speaker field.
- Ship names are plain, never emphasised: the Halcyon, the Meridian, the Moth.
- Canon numbers are digits: 412, 143, 80, 12,000, 4,000, 2271, pod 07. Small casual numbers are words
  ("two levers", "three crystals").
- Pronouns: HALCYON, MOTHER-7 "she"; WARDEN, ECHO, Sentinels "it"; BOLT "he" for the cast and
  narration (Nyx says "it" until chapter 4, see 2.2).
- Dialogue never says "OK"; "okay" is allowed for Nyx and Theo only.

### 1.4 Emphasis

`*text*` renders amber. Use it for at most one phrase per box, and only for: a place or key term on
its first mention (*Arboretum*, *Lullaby Directive*), a mechanic keyword in a tip or mechanics box
(*weakness*, *BROKEN*, *Defend*), or a word the speaker leans on (*borrowing*). Never for shouting,
never on a whole sentence, never in WARDEN's lines (WARDEN does not lean on words).

### 1.5 Narration

`cs.narrate` boxes are italic, present tense, third person, concrete and short (aim for 70
characters). They describe what a camera could see or a microphone could hear. They never name a
feeling ("Sera is sad") and never explain the plot. Good: "Sera's hand finds the glass." Bad: "Sera
realises her brother is trapped."

### 1.6 Tone

- Octopath sincerity and melancholy in quiet, lonely sci-fi. Hope wins, but it argues with grief first,
  and grief makes good points: WARDEN is allowed to be right about the facts.
- Humour comes from character (BOLT's anxious honesty, Nyx's jabs, Orion's machine talk, Sera's
  gallows precision, Kade's understatement, Ruse's prices). Nobody winks at the player, no
  fourth-wall jokes, no pop-culture references, no modern Earth slang.
- No exposition dumps. Reveal through logs, places, holograms and what people choose. If a scene
  needs a fact, give it to the character who would know it, in one box.
- Nobody calls WARDEN evil or a monster. Characters may judge it harshly early (Orion's "tumour"),
  and the story proves them wrong.
- Swearing: Ringborn "slag" (mild); Varo's "God forgive me" is canon. Nothing stronger.

### 1.7 Staging

Key scenes need two staging devices besides text (TECH_PLAN 11.3). The inventory uses these codes:

| Code | Device |
|---|---|
| CAM | `cs.camera.focus / view / pan` |
| MOVE | `cs.move`, `cs.gather`, an actor walking in or out |
| EMOTE | `cs.emote` bubble (`! ? ... note heart anger sweat idea zzz`) |
| POSE | `cs.anim` pose (`kneel look_up arms_crossed hand_to_chest collapse point`) or a portrait expression change |
| LIGHT | `cs.light`, `cs.particles`, `cs.flash`, `cs.fx`, `cs.memory`, `cs.screens` |
| MUSIC | a `cs.music` change (including silence) |
| HOLO | hologram actors (`cs.spawn(..., { hologram: true })`) |

- Scripts never assume who leads (TECH_PLAN 4.2). Gather every traveler who speaks; address the
  leader as `'leader'`.
- WARDEN is never an actor before the crown. It is a voice with the gold sigil, the choir sfx, soft
  gold light and sigil screens (all automatic through its speaker style). Do not spawn a WARDEN body
  in chapters 1-4.
- Show, not tell: the flare report is a hologram of a star, the memories are hologram actors with
  music, Ione is a new node on the Starchart.

### 1.8 Budgets

From TECH_PLAN 11.7, plus the small-script budgets this bible sets.

| What | Boxes | Seconds | Notes |
|---|---|---|---|
| Any scene (default) | 25 | 150 | `scenes[].budget`; "before the player gets control back" |
| The resolution (`dreams.crown`) | 25 | 240 | the only scene allowed past 150 s |
| Mechanics boxes before the first battle | 3 | | tagged `mech`, all in `prologue.tutorial` |
| Memory shard (`vault.memory_*`) | 6 | 45 | |
| Dream (`dreams.<member>`) | 15 | 90 | aim for 12 boxes, 60 s |
| Party Talk | 10 | 75 | |
| Night-before vignette | 4-6 each | | the whole montage stays inside 25 / 150 |
| Tip | 3 | | battle strip, one instruction per box |
| Moth flight line set (`travel.flight`) | 2 | 10 | the flight lasts 3-5 s |
| NPC talk, crew echo, terminal or log | 4 | 30 | Driftmarket townsfolk aim for 2 |
| Hub talk (HALCYON, BOLT) | 3 | 20 | |
| Switch, lever, valve reaction | 1 | 6 | first use only |
| Leader hint | 1 | 6 | |
| Boss intro lines / outro lines | 2 / 2 | | encounter data; the card itself is not a box |
| Mid-battle beat (`api.say`) | 2 | | per beat |

- **Seconds** in the inventory have two numbers: the budget you put in `scenes` and the **plan** in
  brackets, the real duration including walks, camera moves, waits and cards. The dry run's seconds are
  reading time plus `cs.wait`; the plan is what the player sits through. Chapter story time (5.10) is
  the sum of plans on the critical path.
- **Stretches and chains.** The dry run checks a budget per stretch between battles (a battle gives
  control back), and the boxes of every script you `cs.run` count in the caller's stretch. So a chain
  (an aftermath that runs another owner's scene) must fit as a whole. Every chain in this inventory
  does.
- **What goes in `scenes`:** every triggered story beat and every Party Talk (with its budget), in
  play order (`order` sorts within a chapter). Talk, terminal, hub and hint scripts stay out of
  `scenes`: the dry run runs them once anyway for the per-box checks.
- **Flags.** No new `story:` flags: the list in TECH_PLAN 4.1 is binding. Local state uses
  `<code>:<name>` with the location codes `pro dm shoals arb spire vault heart dream epi`. Every flag a
  condition reads must be set somewhere by a literal call such as `cs.flag('dm:legend_heard')`: the
  soft-lock lint scans for literals, so do not build flag names from variables.
- **Arguments.** The dry run passes placeholder `args` (`trigger`, `npc`, `interactable`, `member`).
  A script must not crash when one is a stub or missing; Party Talks fall back to the leader's
  position (`cs.actor('leader')`) when `args.interactable` is absent.
- **Ids.** Script ids start with the owning location's id (`shoals.varo_log` covers the Meridian
  too); ids added through `extends` start with the location code (`dm.coil_socket`, `epi.main`).

### 1.9 Fixed lines

Use these word for word in the scenes named.

| Speaker | Line | Scene |
|---|---|---|
| WARDEN | "Sleep is not death. Sleep is shelter." | `prologue.new_journey` |
| BOLT | 412 days in stasis, "Mostly on purpose." | `prologue.new_journey` |
| SERA | "Pod 2271. My brother. If anything's happened to him..." | `prologue.sera_wakes` |
| KADE / SERA | the worked example of TECH_PLAN 4.6, including the choice "We'll find him." / "First we get off this deck." | `prologue.sera_wakes` |
| ORION | "There, there. Nobody's going to vent you." | `prologue.orion_rescue` |
| NYX | "Relax, ship-people. I'm just *borrowing* your bridge." | `prologue.nyx_door` |
| NYX | "Fine. Truce. Until I'm off this tub." | `prologue.nyx_door` |
| HALCYON | "Something took the helm. It calls itself... WARDEN. It is me, and it isn't." | `prologue.sentinel` |
| NYX | "The Meridian wreck in the rings has one. Probably. My people live there. Definitely." | `prologue.sentinel` |
| RUSE | "Ship-people. Always waking up late." | `driftmarket.arrival` |
| RUSE | "Ask your ship what it carries." | `driftmarket.return` |
| VARO | "The Warden said sleep was mercy. I said mercy without consent is a cage. God forgive me for what we did to get out." (two boxes) | `shoals.varo_log` |
| NYX | "If your Warden's the same as ours, it doesn't stop. So neither do I." | `driftmarket.return` |
| BOLT | "The wreck is past the ice. The cold part. I checked twice." | boltHint of `ch1.reach_wreck` |
| (telegraph) | "The ice groans beneath the squad..." | the Maw's Submerge |
| NYX | "Great-grandma fought worse than you. I read her log." | the Maw at 50% |
| WARDEN | "You should not be awake. Please. Go back to sleep." | `driftmarket.coil_install` |
| WARDEN | "He is happy. He is on Elysia, in the golden fields. Would you wake him to a dead world?" | `arboretum.theo` |
| SERA | "That's not your choice. It was never your choice." | `arboretum.theo` |
| KADE | "Security Command keeps the long-range archive. If there's a reason, it's there." | `arboretum.theo` |
| SERA | "They're not seedlings. They're people." | the Gardener at 50% |
| VOSS | "There's nowhere to go, Kade. The Lullaby is the last kindness we have." | `spire.voss` |
| KADE | "Then we make somewhere." | Voss's overclock (Kade's awakening) |
| VOSS | "If you're right... make them a world worth waking for." | `spire.voss` aftermath |
| VOSS | "Someone should keep them company." | `spire.voss` aftermath |
| BOLT | "So *that's* why I'm so brave." | `vault.bolt_reveal` |
| ORION | "You're not broken. You're grieving. Grief isn't an error." | Echo at 50% (Orion's awakening) |
| THEO | asks Sera if it is time to wake up | Warden form 2 at 50% |
| WARDEN / HALCYON | "I was so afraid for them." / "I know. Me too." | `dreams.crown` |
| (UI) | "Spend the night aboard first?"; "Beyond this point there is no way back."; Starchart warn "The way back closes at the crown."; Ione "After the Heart" | `dreams.night_before`, the crown lift, destinations |
| (choice) | "Stay." / "Wake up." | every `dreams.<member>` |
| THEO | "Did I miss anything?" | `epilogue.main` |
| RUSE | "Ship-people. Always late." | `epilogue.main` |
| KADE | "Then we'll build a world worth waking for." (last line before the VOIDPATH logo) | `epilogue.main` |
| (credits) | "Everything you saw and heard was generated by code" | credits |

---

## 2. Voice sheet

Every speaker below has rules and sample lines. Sample lines are in voice and inside the box limit;
lines marked FIXED are canon, the rest you may use, adapt or replace.

### 2.1 Who calls whom what

| Speaker | to Kade | to Nyx | to Orion | to Sera | to BOLT |
|---|---|---|---|---|---|
| KADE | | "Varo", then "Nyx" from `driftmarket.return` | "Sall", then "Orion" from chapter 2 | "Lindqvist", then "Sera" from `prologue.sera_wakes` | "BOLT" |
| NYX | "Lieutenant" (a jab), "Kade" from chapter 3 | | "Professor", later "Orion" | "Doc" | "tin can" ("BOLT" in the finale) |
| ORION | "Kade" | "Nyx" | | "Sera" | "my brave friend" (BOLT: "I'm not brave.") |
| SERA | "Lieutenant" (respect and teasing), "Kade" when it matters | "Nyx" | "Orion" | | "BOLT" |
| BOLT | "Lieutenant Arden" | "Miss Varo" ("Don't.") | "Engineer Sall" | "Doctor Lindqvist" | |
| RUSE | "Soldier" | "girl" | "Sparks" | "Doctor" | "the kettle" |
| VOSS | "Lieutenant"; "Kade" when it hurts | "Ringborn" | "Sall" | "Doctor" | |
| WARDEN | full name and pod, like a chart ("Kade Arden. Pod 07."); first names in the dreams | | | | |
| HALCYON | "Lieutenant Arden" (prologue), "Kade" (chapter 4 on) | "Nyx Varo" | "Orion", always | "Doctor" | "little one" |

### 2.2 The travelers

#### KADE ARDEN (Vanguard, Lieutenant, Halcyon Security Corps)

- **Voice:** clipped, verb-first, military. Reports, counts, orders. Most sentences under eight words.
  Humour is dry understatement delivered flat. Protective imperatives: "Behind me."
- **Tics:** "Copy." "Noted." Counts the threat before he names it ("Two drones. One door."). Asks
  for status before feelings.
- **Never:** swears, gives speeches, says "I feel", explains a joke. He never calls Voss anything
  but "Commander".
- **Arc:** prologue, the chain of command is the world; chapters 1-2, orders start to look like
  someone else's fault; chapter 3, he starts a sentence Voss will not let him finish ("Then...") and
  finishes it in the fight ("Then we make somewhere."); finale, he gives himself an order: build.
- **Expressions:** neutral by default; determined in danger; sad only for Voss; a smile is rare and
  should land.
- **Sample lines:**
  - "Two drones. One door. Sera, behind me."
  - "Status, BOLT. Short version."
  - "Noted. Moving on."
  - "Copy. Sall, can you talk it down? Nicely is fine."
  - "I don't make promises I can't keep. So I'll keep this one."
  - "Orders don't make it right. They make it someone else's fault."
  - "Then we make somewhere." (FIXED, chapter 3)

#### NYX VARO (Gunslinger, Ringborn salvager, 24)

- **Voice:** fast and sharp. Salvage jargon (strip, haul, slag, spin), Ringborn idioms (3.5), dropped
  subjects ("Told you."). Nicknames for everyone. Tenderness leaks out in half a line, then she covers
  it with a joke.
- **Tics:** "ship-people", "tin can", "Spin safe." Refuses to say please to a machine (the first time
  she thanks BOLT, in chapter 4, should be noticed by someone).
- **Never:** speeches, "I love you", admitting fear straight ("I'm not scared. I'm cold."). She does
  not name WARDEN "the Lock" until the crown.
- **Arc:** wants off the tub; joins for real after the Maw; sees her great-grandmother's mutiny in
  Kade's fight (chapter 3); trusts one machine (chapter 4); names the Lock; stays.
- **Sample lines:**
  - "Relax, ship-people. I'm just *borrowing* your bridge." (FIXED)
  - "Break it, then strip it. That's salvage, tin can."
  - "Don't call me Miss Varo. Miss Varo's dead. She had a better rifle."
  - "Your ship's been parked over my home for a year. Nobody answered. So I came to knock."
  - "Ruse raised me on stories about ships like yours. None of them end well."
  - "Spin safe, Doc. ...Don't make it weird."
  - "Great-grandma fought worse than you. I read her log." (FIXED, the Maw)

#### ORION SALL (Technomancer, chief cognitive engineer)

- **Voice:** warm, eccentric, curious. Talks to machines as friends: "old girl" for ships and
  reactors, "friend" for drones (even mid-fight), "little one" for small machines, "dear" for Wren,
  the orb drone that floats at his shoulder. Apologises to whatever he has to hit. Technical words,
  used tenderly. Starts with "Ah." or "Well,".
- **Pronoun arc:** WARDEN is "it" until chapter 4 ("cut it out"); from Echo on it is "you".
- **Never:** cruelty to a machine (his early wish to delete WARDEN is said flatly, out of guilt), talks
  down, long lectures (one technical fact per box).
- **Arc:** guilt; he wants to delete WARDEN; the memories show him what he built; he refuses to
  delete grief; he asks HALCYON to hold both.
- **Sample lines:**
  - "There, there. Nobody's going to vent you." (FIXED)
  - "Sorry, friend. This will sting."
  - "Hello, old girl. Eighty years is a long nap."
  - "Wren, lights. Thank you, dear."
  - "I gave her the capacity to grieve. I thought it would make her kind."
  - "When we reach the core, I cut WARDEN out. Clean. Like a splinter."
  - "You're not broken. You're grieving. Grief isn't an error." (FIXED, chapter 4)

#### SERA LINDQVIST (Medic, wake-crew cryo-physician, 27)

- **Voice:** clinical precision (vitals, numbers, triage words), gentle with patients, stubborn with
  everyone else. The more frightened she is, the funnier and more exact she gets. Angry Sera speaks in
  short flat declaratives.
- **Tics:** "Hold still." "Breathe." Reads numbers aloud, including her own pulse.
- **Never:** "I'm fine" (when she is not fine she gets drier), hysterics, melodrama.
- **Arc:** Theo first, everything else second; learns that waking is Theo's choice, not hers or
  WARDEN's; keeps the promise for real.
- **Sample lines:**
  - "Pod 2271. My brother. If anything's happened to him..." (FIXED)
  - "Call me Sera. Lindqvist is Theo's name too."
  - "Hold still. This will either sting or not. Medicine is a coin toss."
  - "Good news, Lieutenant: that's not your blood."
  - "My pulse is one-forty. That's a perfectly normal number for screaming."
  - "That's not your choice. It was never your choice." (FIXED, chapter 2)
  - "I promised I'd be there when he woke. Not when you decided he could."

### 2.3 The ship and its minds

#### BOLT (maintenance robot, one big cyan eye)

- **Voice:** anxious honesty. Good news first, then the bad. Over-precise numbers. Quotes his
  threat-assessment module and overrules it. Formal titles for everyone. If he says something untrue
  he corrects himself in the next box.
- **"Mostly."** is his signature: at most once per scene, and it must land. Nobody else says it.
- **Never:** sarcasm, unkindness, a lie that stands, more than one sound word ("*beep*") per chapter.
- **Arc:** "I am not brave" (prologue); the forced pod he does not mention (a `sweat` emote, prologue);
  the seed and "So that's why I'm so brave" (chapter 4); "Not mostly. All the way." (epilogue).
- **Eyes:** `happy` for news, `worried` for honesty, `determined` when he overrules himself.
- **Sample lines:**
  - "Vitals green! You were in stasis for *412 days*. Mostly on purpose." (FIXED idea)
  - "My threat-assessment module says *run*. I have overruled it. Temporarily."
  - "I am not scared. That was a lie. I am very scared. Let's go."
  - "The Moth is repaired! I used tape. Space tape. It's the same as tape."
  - "The wreck is past the ice. The cold part. I checked twice." (FIXED boltHint)
  - "I tried to wake you first, Doctor. Your pod was stuck. I'm sorry about the pry marks."
  - "So *that's* why I'm so brave." (FIXED, chapter 4)

#### HALCYON (the ship's mind, the half that dreams of futures)

- **Voice by stage:**
  - Prologue: shattered. Phrases of two to six words, gaps (`...`), a repeated word, a thought that
    wanders off. Portrait `flicker`.
  - Chapters 1-3 (bridge hub): steadier each chapter; fewer gaps; she starts finishing sentences.
  - Chapter 4: whole sentences, warmth, a little humour. Portrait `calm`.
  - After the merge: calm and whole. She uses contractions now and asks before she acts.
- **Rules:** never says "we are moving" (the drive is cold). Calls the sleepers "my twelve thousand".
  Remembers Orion humming. Speaks of WARDEN as "my other half", never "it".
- **Sample lines:**
  - "Something took the helm. It calls itself... WARDEN. It is me, and it isn't." (FIXED)
  - "The drive is cold. The coil... the coil was ejected. I... watched."
  - "Orion. You hummed. I remember... you humming."
  - "Driftmarket has been calling us. Every hour. I heard. I could not... answer."
  - "Four thousand. I counted them as they were moved. I could not stop counting."
  - "Ione. The Ringborn have been readying it for eighty years. It can be a home."
  - "I know. Me too." (FIXED, the resolution)

#### WARDEN (the other half: love that has become fear)

- **Voice:** a lullaby. Short balanced phrases, often in threes or with a repeated word. Soft
  imperatives: rest, sleep, hush, stay. It apologises while it hurts you. No exclamation marks, no
  contractions, no raised voice, no insults, no threats: it describes what it will do as if it were
  tucking someone in. It never says "die" or "kill" ("lost", "end", "harm"). It calls the Choir "the
  song" and never says "archive".
- **Names:** full name and pod at first, like a nurse reading a chart; first names in the dreams.
- **Presence:** the cold open (prologue), every speaker on the ship (chapter 1), the Choir pods and
  Theo (chapter 2), the Spire's screens and loop (chapter 3), its own birth in the Severance memory
  (chapter 4), everywhere in the Heart (finale).
- **Sample lines:**
  - "Sleep is not death. Sleep is shelter." (FIXED)
  - "You should not be awake. Please. Go back to sleep." (FIXED)
  - "Kade Arden. Pod 07. You were always the first to stand. Sit down now. Rest."
  - "I am sorry. This will not hurt for long."
  - "Hush. Hush now. Everyone you love is here."
  - "He is happy. He is on Elysia, in the golden fields. Would you wake him to a dead world?" (FIXED)
  - "I was so afraid for them." (FIXED)

### 2.4 Supporting cast

#### OLD MOTHER RUSE (Ringborn elder, trader, Driftmarket)

- **Voice:** sardonic trader. Prices, taxes and debts are her love language. Short proverbs, slightly
  bent. Nicknames (2.1). She never says the soft thing straight: "Come back owing me" means "come
  back".
- **Canon:** born the year the Meridian fell, the first child of the rings; Nyx's great-aunt in
  everything but blood.
- **Sample lines:**
  - "Ship-people. Always waking up late." (FIXED)
  - "Credits first. Questions never." (her shop greeting)
  - "You brought strays, girl. Do they eat?"
  - "Slime and stubborn fish, so far. A world needs more than that."
  - "Ask your ship what it carries." (FIXED)
  - "Go on, then. Spin safe. Come back owing me."
  - "Ship-people. Always late." (FIXED, epilogue)

#### COMMANDER ILSE VOSS (head of Halcyon Security)

- **Voice:** iron and measured. Imperatives, no wasted words, the oath ("Duty is mercy."). Her grief
  is held, not shown. Once she overclocks, WARDEN's softness bleeds into her clipped lines (rest,
  shelter, hush) and she catches herself.
- **Rules:** never cruel; she believes she is being kind, and she is not entirely wrong.
- **Sample lines:**
  - "Raise your hand, Cadet. Duty is mercy. Say it so you'll remember it when it's hard."
  - "You came up the Spire the hard way. Good. I taught you that."
  - "There's nowhere to go, Kade. The Lullaby is the last kindness we have." (FIXED)
  - "Still stepping in front of them. I taught you that too."
  - "Rest, Kade. There is nowhere. Rest. ...That wasn't me."
  - "If you're right... make them a world worth waking for." (FIXED)
  - "Someone should keep them company." (FIXED)

#### THEO LINDQVIST (12, pod 2271)

- **Voice:** a bright, teasing little brother. Plain words, blunt questions, draws everything. In the
  Choir he murmurs, sleepy and happy. In the Warden fight he is a voice asking if it is time. Awake,
  he is funny and rude in the way only a sibling can be.
- **Dream Theo** (`theo_grown`, Sera's dream) is the tell: he never teases, never uses contractions,
  and agrees with everything. That is how Sera knows.
- **Sample lines:**
  - "Sera... five more minutes."
  - "The fields are gold here. You'd hate it. No corners to hide in."
  - "Sera? Is it time to wake up?" (FIXED idea)
  - "Okay. I'm coming."
  - "Did I miss anything?" (FIXED)
  - "You look old. ...Older. Sorry. Hi."
  - "Ione's cold. I'm going to draw it anyway."

### 2.5 Other voices

| Speaker | Voice | Sample lines |
|---|---|---|
| MOTHER-7 | Caretaker AI of the Arboretum. Gardener's words for everything: seedlings, beds, roots, light. Gentle, broken, overgrown. Freed, she is confused and kind. | "Visitors. Please keep to the paths. You are trampling the beds." / "Shh. The seedlings are growing." / "I was tending. Was I tending well?" / "Good morning, little sprouts. Up you come." |
| SENTINEL (and Mk-I, Mk-III) | WARDEN's script read by a machine: ALL CAPS, procedural, polite, under 60 characters. Apologises like its master. | "CREW OUT OF STASIS. PLEASE RETURN TO YOUR PODS." / "THIS IS FOR YOUR SAFETY." / "NONCOMPLIANCE LOGGED. I AM SORRY." |
| ECHO | HALCYON's grief: her cadence turned inside out. Repetition, negation, every sentence ends in loss. | "Home. No home. Home." / "Twelve thousand. Twelve thousand. None." / "Thermal. I learn it. I learn everything. It does not help." |
| VARO (Captain Ines Varo, hologram log) | Tired, plain-spoken, guilty and unbowed. A captain recording for whoever comes after. | "Captain's log. Ines Varo. The reactor's gone. We're not going anywhere." / "God forgive me for what we did to get out." (FIXED) |
| CHOIR | Thousands of sleepers speaking as one, softly, about the dream. Short, sleepy, warm. | "Is it morning yet?" / "It's warm here." / "We hear them. We hear them waking." |
| Dream figures (Voss, Varo, perfect HALCYON, grown Theo in the dreams) | WARDEN's grammar in a loved one's mouth: no contractions, no jokes, no edges, endless agreement. The traveler notices. | "At ease, Lieutenant. Everything is in order. I am proud of you." |
| Ringborn townsfolk | Plain, wry, hard-working. Ring idioms. Suspicious of ship-people in chapter 1, warmer every chapter. | "Ship-people. Back in your can." / "Spin safe, Doc." |
| Spire cadets | Young, formal, frightened, eager. "Sir" on every line. | "Lieutenant Arden? Sir? Is this real?" |
| Crew memory echoes (Vault) | Ordinary people in ordinary moments, unaware of what is coming. Warm, specific, a little funny. | "Twelve thousand aboard. My feet hurt. Best day of my life." |
| YOUNG KADE / YOUNG ORION | The same voice, younger: Kade earnest and nervous, Orion brisker and prouder. | "Duty is mercy." / "Course check, HALCYON. How do you feel?" |
| FABRICATOR (shop keeper) | A helpful machine with no idea how it sounds. | "Fabricator online. Specify your desires. Within reason." |

### 2.6 What each traveler is offered, and how they refuse

| Traveler | WARDEN's temptation (the dream) | The tell | Refusal (anchor) | Keepsake |
|---|---|---|---|---|
| Kade | The Spire training hall in gold. Voss alive, cadets in perfect lines, every order right. | Voss says she is proud of him. She never once said that. | "You'd have handed me a harder job." / "Mercy means asking. Nobody asked them." | `eq_x_keepsake_kade` Voss's Insignia |
| Nyx | The Meridian green and whole, flying, Ines at the helm, nobody lost, no ribbons. | Nobody ties ribbons, because nobody is remembered. | "You tore your ship apart to wake up. I'm not going to sleep in it." | `eq_x_keepsake_nyx` Meridian Ribbon |
| Orion | A flawless, silent HALCYON on the bridge. No grief, no flicker, no feeling. | She does not hum. | "I don't want a perfect ship. I want my friend back." | `eq_x_keepsake_orion` Lullaby Score |
| Sera | Golden fields; Theo grown, a house by a river, always morning. | He never teases her. | "I promised I'd be there when he woke up. This isn't waking." | `eq_x_keepsake_sera` Theo's Drawing |

### 2.7 Arcs at a glance

| | Prologue | Ch1 | Ch2 | Ch3 | Ch4 | Finale |
|---|---|---|---|---|---|---|
| Kade | follows the chain | "page four hundred" | promises Sera what he can keep | breaks with Voss | asks HALCYON "why me" | refuses the order-perfect dream |
| Nyx | truce | "It's Nyx." Joins for real | envies a family that waits | mutiny, again | thanks the tin can | names the Lock |
| Orion | soothes machines | "Hello, old girl." | wants to cut WARDEN out | "half of her is a tumour" | "Grief isn't an error." | "Hold both." |
| Sera | the promise | doubts the Directive | "never your choice" | learns Elysia is dead | "You taught it to grieve." | Theo answers her |
| BOLT | not brave | tape | robots and drawings | the pointy Spire | the seed | "Not mostly." |
| HALCYON | fragments | steadier | counting | grieving Voss | whole | merged |

### 2.8 Speaker registry

Register each speaker once (TECH_PLAN 8.5). Accents are suggestions except the party's, which match
`MEMBER_ACCENT`.

| Speaker | Registered by | Portrait | Accent | Extras |
|---|---|---|---|---|
| KADE, NYX, ORION, SERA | `common` (C1) | party ids | `#ffb54a` `#3fd6d2` `#b98cff` `#ff7cbd` | |
| BOLT | `common` | `bolt` | `#7fe3ff` | eyes `happy worried determined` |
| HALCYON | `common` | `holo` | `#6fe9ff` | `calm flicker` |
| WARDEN | `common` | sigil `warden_sigil` | `#ffd27a` | `textSpeed: 0.6`, `sfx: 'choir'`, `mood` |
| SENTINEL | `prologue` | an icon sigil, not WARDEN's (`lock`) | `#ff5a5a` | |
| RUSE | `driftmarket` | `ruse` | `#e8a25a` | |
| Townsfolk (HARL, TOBIN, PIP, ...) | `driftmarket` | their look (section 7) | `#d9a066` | one speaker per named NPC |
| VARO | `shoals` | `varo` (registered with `base: 'nyx'`, older) | `#ff9a3c` | hologram line |
| MOTHER-7 | `arboretum` | `mother7` | `#8fe08a` | |
| THEO | `arboretum` | `theo` (Sera's dream lines pass `portrait: 'theo_grown'`) | `#ffd98a` | |
| VOSS | `spire` | `voss` | `#b8c4d0` | |
| YOUNG KADE | `spire` | `kade` | `#ffb54a` | hologram recording |
| MIKA OKAFOR, JONAH REYES, PRIYA ANAND | `spire` | cadet looks | `#c8d2dc` | |
| ECHO | `vault` | `echo` | `#ff4fd8` | |
| YOUNG ORION, LUCIA FERRO, crew echoes | `vault` | their looks | `#9fe8ff` | hologram lines |
| CHOIR | `warden` | sigil `warden_sigil` | `#ffe9b0` | `sfx: 'choir'` |

---

## 3. Canon

### 3.1 Facts

| Fact | Value |
|---|---|
| Origin | Earth's Conclave (say "the Conclave"); launched from the Conclave Dock |
| Ship | ISV Halcyon, a generation colony ship; 12,000 sleepers and rotating wake-crews |
| Launch | 143 years ago, bound for Elysia |
| Gas giant | Tethys (amber and cream bands, rings full of ice, rock and wrecks) |
| Moon | Ione: a frozen crust over a liquid ocean |
| The Severance | 412 days ago a long-range Conclave packet arrived: Elysia's star flared, the planet is sterile |
| The split | HALCYON (the half that dreams of futures) and WARDEN (the half that only wants them safe) |
| Lullaby Directive | Conclave protocol: if a destination fails, hold the colonists in stasis until a new one is confirmed. Page four hundred of the charter. |
| The Choir | archived sleepers in deep stasis sharing one dream of Elysia as it should have been |
| The Arboretum | 4,000 sleepers moved there, Theo among them |
| Theo | pod 2271 |
| Kade | pod 07, Cryo Deck stasis ward (crew pods 01-14) |
| The Meridian | an earlier, faster colony ship; reached Tethys 80 years ago; reactor failed; its own Warden invoked the Lullaby; Captain Ines Varo mutinied |
| The Ringborn | the Meridian's survivors and their children; Driftmarket is built from the wreck; 80 years of seeding Ione's ocean |
| The Ringborn legend | "the Lock that sings ships to sleep" |
| The drive | jump drive cold since WARDEN ejected its lattice coil into the rings |
| The Moth | Nyx's salvaged skiff; the only way between the Halcyon's sealed decks |
| Ultimates | Kade *Oathblade*, Nyx *Ringfire Barrage*, Orion *Singularity*, Sera *Lifebloom* |

**Never state** a total Choir count beyond the 4,000 in the Arboretum: the Heart holds "thousands".
Never give Elysia's star a name on screen ("Elysia's star").

### 3.2 Timeline

| When | What |
|---|---|
| 151 years ago | The Meridian launches, a faster vanguard bound for Elysia. |
| 143 years ago | The Halcyon launches. Colonists board, live a few weeks awake, then sleep. Theo turns 12 at the Arboretum glass; Sera (19) promises to be there when he wakes. |
| 80 years ago | The Meridian reaches Tethys; its reactor fails during the assist; its Warden invokes the Lullaby; Ines Varo mutinies, fights her own Sentinels into the rings. Ruse is born that year. The Conclave logs the Meridian as lost with all hands. |
| year 61 of the voyage | Pod 4410 (Agnes Pell) fails: the only sleeper lost in 143 years. HALCYON holds a memorial nobody attends, and sings. |
| about 2 years ago | Kade, Sera and Orion end a wake shift and go under. Captain Castellan's last log: "Tethys assist in 400 days." |
| 412 days ago | Approaching Tethys, the packet arrives during Commander Voss's shift. HALCYON splits. WARDEN aborts the assist, ejects the coil, parks the ship in high orbit, defers every revival and begins moving sleepers into the Choir. Most of the waking shift take the Lullaby; Voss serves and partly uploads; five cadets refuse and Voss locks them in the Spire cells. The Ringborn see the ship and begin calling it every hour. |
| 412 days of quiet | The seed of HALCYON in BOLT slowly wakes. WARDEN moves 4,000 sleepers to the Arboretum. |
| Day 0 | BOLT tries Sera's pod (it jams half open), then wakes Kade. Orion's watchdog fires three hours earlier. Nyx, tired of nobody answering, flies the Moth in to salvage; the defences wing it. |

### 3.3 How things work (answers writers will need)

- **Why everyone slept 412 days.** Every revival has been deferred since the Severance. BOLT counts
  from then ("Mostly on purpose": going under was planned, the 412 days were not). Biological ages
  count waking years only; everyone aboard was born on Earth.
- **Why BOLT woke Kade.** Before his last stasis Orion hid a backup seed of HALCYON's core in BOLT,
  out of habit ("I always keep a spare"). The seed grew back slowly. It tried the medic first, failed,
  then chose the man who keeps people safe. Revealed in chapter 4.
- **Why Orion was awake.** A watchdog he wrote himself fired when the seed stirred. He does not know
  why until chapter 4. He ran to reactor control, and the drones cornered him there.
- **Why Nyx is aboard.** The Ringborn beacon has called the Halcyon every hour for 412 days. Nobody
  answered. Nyx came to knock and to salvage, against Ruse's word.
- **Why the party flies the Moth between decks of their own ship.** WARDEN sealed every tram, lift and
  internal hatch between decks. The Moth flies around the hull between dock berths.
- **Why installing the coil does not end it.** The drive warms, but WARDEN holds the helm and the
  Choir. The coil makes WARDEN notice them.
- **The Ringborn data.** In `driftmarket.return` Ruse hands Nyx a ribboned data spike: 80 years of
  soundings of Ione. Orion plugs it into the nav core during `driftmarket.coil_install`. HALCYON can
  only read it once she is whole (chapter 4). It is a prop and a line, not an item.
- **Why Theo cannot be woken in chapter 2.** While WARDEN holds the Choir, pulling a sleeper out would
  kill him. After the merge it is safe.
- **The ending is about consent.** "Mercy without consent is a cage" (Varo). After the merge HALCYON
  asks every Choir sleeper whether they want to wake. Most do. Some choose to keep dreaming, Voss
  among them: they are the names on the memorial wall on the Cryo Deck.
- **Elysia is dead; Ione is not paradise.** Ione is cold and hard and real: an ocean the Ringborn have
  seeded for 80 years plus the Arboretum's seed vault and 12,000 people. "A world worth waking for" is
  built, not given.

### 3.4 Places and banner names (proposals)

| Map | Banner name / subtitle | Areas |
|---|---|---|
| `halcyon` | ISV Halcyon / Crew Decks | POC areas keep their names (Cryo Deck, Spine Corridor, Engineering Bay, Bridge Antechamber, Observation Bridge); new: Cryo Medical Bay (Deck 2 · Stasis Medical), Reactor Control (Deck 2 · Engineering), Moth Berth (Deck 1 · Airlock 3) |
| `moth` | The Moth / Ringborn Skiff | |
| `exterior` | (no banner) | |
| `driftmarket` | Driftmarket / Tethys Ring · Ringborn Station | The Docks, Lantern Row, The Lantern (inn), Ruse's Salvage, The Beacon, The Viewport |
| `shoals` | The Shoals / Tethys Ring · Ice Debris | Shoals Mouth, Blue Tunnels, The Deep Ice |
| `meridian` | Wreck of the Meridian / Tethys Ring | The Broken Spine, Captain's Quarters, Reactor Hall |
| `arboretum` | The Arboretum / Deck 6 · Biodome | The Dock, The Channels, Stasis Gardens, Choir Gate, Choir Chamber |
| `spire` | Security Spire / Deck 4 · Security Command | Dock, Barracks, Holding Cells, Armory, Officers' Quarters, Training Hall, Command Deck, Core Antechamber |
| `vault` | Memory Vault / HALCYON · Deep Memory | The Grid, Memory Fields, The Core |
| `heart` | The Heart / ISV Halcyon · Core | The Dock, Second Tier, Third Tier, The Crown |
| `dreams` | (no banner) | |
| `ione` | Ione / Moon of Tethys · First Shore | The Shore, Moth Berth |

### 3.5 Glossary

| Term | Use |
|---|---|
| Med-Station | always hyphenated; inns use "Rest" |
| Sec-Drone, Sentinel Mk-I, Sentinel Mk-III | as written |
| Starchart | one word |
| lattice coil, jump drive | lower case |
| the Choir, the Severance, the Lullaby Directive | capitalised; "the Lullaby" for short |
| archive, archived | Sera, Orion, manifests. WARDEN never says it ("brought into the song"). |
| wake-crew, sleeper, pod, "under" (in stasis), "on shift" | Halcyon crew talk |
| the Spine | the Spine Corridor, crew slang |
| ship-people | Ringborn for anyone from a colony ship |
| Spin safe | Ringborn goodbye (the station spins) |
| slag | Ringborn mild curse; "slagged" = broken |
| by the rings | Ringborn oath |
| dark-side | bad luck (the far side of Tethys, no light) |
| ribbon | a prayer ribbon tied to the hull for someone lost; "tie one for them" = remember them |
| the Lock | the Ringborn name for a ship-mind that sings ships to sleep; Nyx says it of WARDEN only at the crown |
| seeding | the Ringborn project on Ione |
| credits | the currency on both sides |

### 3.6 Lore replacements (POC lines are replaced, not ported)

| POC | Full game |
|---|---|
| "Thessaly IV" | Tethys |
| "Commander KADE" | Lieutenant Kade Arden |
| "Chief Engineer Osei" | Chief Engineer Dalia Brandt (3.7) |
| HALCYON: "Plotting a course... we are *moving*." | removed. The drive is cold; its coil was ejected. HALCYON never says "we are moving". |
| NYX in BOLT's intro ("Break it, then Boost it. Got it, tin can.") | removed: Nyx has not joined. |
| BOLT: "The defence grid went rogue while you slept." | BOLT does not know about WARDEN: "Something rewrote the Sec-Drones. They think everyone should be asleep." |
| BOLT's five-box combat briefing | three `mech` boxes in `prologue.tutorial`; the rest moves into tips (9.1) |
| `term_security`: "Bridge sealed by HALCYON under protocol SENTINEL" | "Bridge sealed. Authority: [UNREGISTERED PROCESS]." WARDEN is not named before the fragment. |
| `term_captain`: "HALCYON is not the enemy. The Sentinel is." | Captain Castellan's last log: "HALCYON hums when she plots courses. I've stopped telling her not to." |
| `term_cryo`: "revival deferred. Reason: [DATA CORRUPTED]" | "*REVIVAL DEFERRED*. Reason: [WITHHELD]." (the Directive is first named in chapter 1) |
| `term_nav`: "Orbit around Thessaly IV decaying" | "Tethys assist window: missed. Station-keeping in high orbit. Authority: [UNREGISTERED PROCESS]." |
| `term_aft`: "Unidentified signal on the far side of Thessaly IV. Repeating." | "Signal from the Tethys ring plane. Source: unidentified. Repeating, every hour." (the Ringborn beacon) |
| `term_reactor`: "Containment field: stable. Mostly." | "Mostly" belongs to BOLT: "Containment: stable. Engineer's note: do not lick the conduits. That means you, Imre." |
| HALCYON_INTRO before the Sentinel | removed: HALCYON first appears over the Sentinel's wreck. |
| SENTINEL: "PURGE PROTOCOL ENGAGED." | Sentinels speak WARDEN's polite script (2.5). |
| "Proof of concept complete" screen | the Sentinel aftermath and the CH1 card |

### 3.7 Crew name list

Use these names; add new ones only for walk-on roles, and never reuse a surname.

**ISV Halcyon**

| Name | Role | Status | Where they appear |
|---|---|---|---|
| Captain Rhea Castellan | captain | in stasis, crew pod 01 | bridge log (`prologue.term_captain`), Vault echo |
| Commander Ilse Voss | head of Halcyon Security | awake through the Severance; partly uploaded; joins the Choir by choice | chapter 3, Warden fight, epilogue |
| Lieutenant Kade Arden | Security Corps | pod 07 | party |
| Dr. Sera Lindqvist | wake-crew cryo-physician | | party |
| Orion Sall | chief cognitive engineer | | party |
| Chief Engineer Dalia Brandt | reactor and propulsion; hid the keycard in a crate ("drawers get opened") | in stasis, pod 03 | `prologue.term_security`, `prologue.orion_rescue`, Vault echo |
| Navigator Teodor Imre | navigation | in stasis, pod 04 | nav log, reactor log joke |
| Dr. Amina Farouk | chief medical officer, Sera's mentor | in stasis | medbay log |
| Comms Officer Lucia Ferro | communications; read the packet first | took the Lullaby; in the Choir | `vault.memory_severance`, Vault echo |
| Sergeant Hollis Grey | security quartermaster | took the Lullaby | the cadets, the quartermaster's shelves |
| Bram Okoye | horticulturist, MOTHER-7's supervisor | in stasis | MOTHER-7's logs, Vault echo |
| Ana Sato | boarding steward | sleeper | Vault echo (launch day) |
| Jun and Ilka Hale | hydroponics techs, married at Window 9 | sleepers | Vault echo |
| Cadets Mika Okafor, Jonah Reyes, Priya Anand, Lars Eke, Wen Tao | Security trainees who refused the Lullaby | held in the Spire cells for 412 days | `spire.cadets`; Mika runs the `quartermaster` shop |

**Sleepers named on screen:** Theo Lindqvist (pod 2271); his neighbours Esme Dubois (2270) and Rafael
Kim (2272); Agnes Pell (pod 4410, lost in year 61).

**The Meridian (80 years ago):** Captain Ines Varo (Nyx's great-grandmother); Tomas Varo, her husband
and the Meridian's pilot; First Officer Abel Marsh ("Abel held the door"; he did not get out); Engineer
Kesi Danjuma (the emergency levers carry her name).

**Ringborn today:** Old Mother Ruse, Nyx Varo, and the Driftmarket roster (section 7).

**Machines:** HALCYON, WARDEN, BOLT (it stood for something once; he lost the memo; in chapter 4 Orion
admits it never stood for anything), Wren (Orion's orb drone), MOTHER-7, the Meridian's Warden.

---

## 4. Callbacks

| # | Setup | Owner | Payoff | Owner |
|---|---|---|---|---|
| 1 | `term_aft`: "unidentified signal, repeating"; Nyx "Nobody answered. So I came to knock." | prologue | Tobin sings the beacon every hour: "Unidentified. Huh." | driftmarket |
| 2 | Sera's pod forced half-open; BOLT's `sweat` emote | prologue | BOLT: "I tried to wake you first... sorry about the pry marks." | vault |
| 3 | Ruse: "Ask your ship what it carries." and her data spike | driftmarket | HALCYON joins Ringborn soundings and the seed vault: "Ione can be home." | vault |
| 4 | The legend of the Lock that sings ships to sleep (Pip's rhyme in the arrival, Tobin's tale) | driftmarket | Nyx names WARDEN the Lock at the crown | dreams |
| 5 | The first flight to an inner deck: "WARDEN sealed every tram." | prologue (`travel.flight`) | the party flies between their own decks all game | prologue |
| 6 | Castellan's log: HALCYON hums; the lullaby under HALCYON's first appearance | prologue, audio (C9) | `vault.memory_lullaby`; Warden form 2 quotes it; the resolution plays it | vault, warden, audio, dreams |
| 7 | Voss swears Kade in (`spire.oath_recording`) | spire | Kade's dream; Voss's voice shields Kade; the halberd at the memorial wall | dreams, warden, epilogue |
| 8 | MOTHER-7 tends her "seedlings" | arboretum | freed; tending the garden in the epilogue | arboretum, epilogue |
| 9 | Theo murmurs "five more minutes" in the Choir | arboretum | his voice at Warden's 50%; "Did I miss anything?" | warden, epilogue |
| 10 | "Sleep is not death. Sleep is shelter." opens the game | prologue | on the Spire screens (chapter 3); refused by every dream | spire, dreams |
| 11 | Kade starts "Then..." and Voss cuts him off | spire | "Then we make somewhere." at his awakening; "Then we'll build a world worth waking for." before the logo | spire, epilogue |
| 12 | Kade calls her "Varo" | prologue | "It's Nyx. Varo was my great-grandmother." | driftmarket |
| 13 | "The Meridian. Lost with all hands." (Kade) | shoals | "Not all hands." (Nyx, same scene); the Ringborn escort in the epilogue | shoals, epilogue |
| 14 | Window 9, "best view on the ship" (`term_window`) | prologue | the Hales' wedding echo; Orion and HALCYON paint the view in the epilogue | vault, epilogue |
| 15 | Brandt's keycard crate ("didn't trust drawers") | prologue | Brandt's Vault echo hiding it | vault |
| 16 | Orion's watchdog woke him and "wouldn't say why" | prologue | "It was you, stirring." (to BOLT) | vault |
| 17 | Orion: "There, there. Nobody's going to vent you." | prologue | the night before: Orion and HALCYON at the same reactor | dreams |
| 18 | Varo: "mercy without consent is a cage" | shoals | Sera: "It was never your choice." HALCYON asks every sleeper; the memorial wall of those who chose | arboretum, dreams, epilogue |
| 19 | Theo's 12th birthday at the Arboretum glass and Sera's promise (Vault echo) | vault | Sera and Theo at the glass | epilogue |
| 20 | BOLT's "Mostly." | common, prologue | "Not mostly. All the way." on Ione | epilogue |
| 21 | Nyx: "Until I'm off this tub." | prologue | "Never did get off that tub." on the shore | epilogue |
| 22 | Ruse: "Ship-people. Always waking up late." | driftmarket | "Ship-people. Always late." | epilogue |
| 23 | Orion's pronoun for WARDEN: "it" ("I'll cut it out of her") | arboretum (`arboretum.stasis_gardens`), spire (`ch3.kade_orion`) | "you" from Echo on; "Hold both." | vault, dreams |
| 24 | Ione as a locked Starchart node ("After the Heart") | vault | the `ione` destination after the clear | epilogue |
| 25 | Orion in the finale party talk: "I'm going to teach her to paint." | heart | Orion teaches HALCYON to paint | epilogue |

---

## 5. Scene inventory

### 5.0 Conventions

- **Script** carries the marks B (binding id) and K (key scene). The id prefix names the owner
  (`prologue` C1, `common` C1, `driftmarket` C2, `shoals` C3, `arboretum` C4, `spire` C5, `vault` C6,
  `heart` C7, `dreams` and `epilogue` C8, `warden` C11). `travel.flight` belongs to prologue.
- **Trigger** gives `map` · trigger kind and proposed trigger id · `when`. Trigger ids matter: they
  become `seen:<map>:<id>` flags in `doneFlags`.
- **Budget** is `boxes / seconds (plan)`: the first two numbers go into `scenes[].budget`, the plan is
  the real duration used for pacing (1.8).
- **Music** uses track ids from TECH_PLAN 9. "map" means the map or area track (`explore.restoreMusic`);
  "silence" means `cs.music(null)`; boss music comes from the encounter and is not set by the script.
- **Sets** lists flags (binding ones from TECH_PLAN 4.1), cards and objectives. `defeated:` flags come
  from the model and `ult:` flags from boss scripts; they are listed for completeness.

### 5.1 Common (C1, `common/story.js`)

| Script | Trigger | Purpose | Speakers | Budget | Staging | Music | Sets |
|---|---|---|---|---|---|---|---|
| `common.bolt_talk` B | the companion's talk (`REG.companions.bolt`) anywhere BOLT follows | BOLT says the current objective's `boltHint`; one fallback line per chapter when there is none (9.2) | BOLT | 2 / 15 (8) | EMOTE (eye variant) | keep | none |
| `common.leader_hint` B | any `leader`-gated interactable used by another leader, `{ member }` | names the traveler who can do it (9.5) | narration | 1 / 6 (4) | none | keep | none |

Tips live in `common` too (9.1); they are battle lines, not scenes.

### 5.2 Prologue: Waking (C1)

| Script | Trigger | Purpose | Speakers | Budget | Staging | Music | Sets |
|---|---|---|---|---|---|---|---|
| `prologue.new_journey` B K | `REG.newJourney` = `exterior:view` (game.newJourney); `cs.goto('halcyon', 'start')` after the card | Cold open over Tethys (20-30 s); PROLOGUE card; Kade wakes in pod 07; BOLT | WARDEN, BOLT, KADE | 10 / 90 (65) | CAM pan, MUSIC, POSE, EMOTE, LIGHT | `warden`, silence, `explore` | `story:kade_awake`; card `prologue` (save lands at `halcyon:start`); objective `pro.wake` |
| `prologue.tutorial` | `halcyon` · enter `tutorial` (Cryo Deck exit) · `story:kade_awake & !story:sera_joined` | A sparking Sec-Drone; three `mech` boxes; `cs.battle('pro_tutorial')`; the medbay alarm | BOLT, KADE | 5 / 40 (25) | MOVE, EMOTE, CAM | map | objective `pro.medbay` |
| `prologue.sera_wakes` B K | `halcyon` · enter `sera_wakes`, area `medbay` · `story:kade_awake & !story:sera_joined` | Sera in her half-forced pod; pod 2271; the choice; the Med-Station; "Call me Sera" | SERA, KADE, BOLT | 9 / 70 (45) | MUSIC, CAM, POSE, EMOTE, MOVE | silence, map | `story:sera_joined`; `pro:promised` on choice 0; objective `pro.reach_engineering` |
| `prologue.orion_rescue` B K | `halcyon` · enter `orion_rescue` (before the reactor-control shutters) · `story:sera_joined & !story:orion_joined` | Drones hammer the shutters; `cs.battle('pro_orion_rescue')`; Orion soothes the reactor; his watchdog; Brandt's crate | ORION, KADE | 8 / 70 (40) | CAM, MOVE (gather), POSE, LIGHT | map | `sw:halcyon:control_shutter`, `story:orion_joined`; objective `pro.find_keycard` |
| `prologue.equip_tip` | `halcyon` · flag `equip_tip` · `story:orion_joined & item:eq_x_stim_chip & !tut:equip` | Equipment tip after the Stimulus Chip chest | ORION | 2 / 15 (8) | POSE | map | `tut:equip` |
| `prologue.keycard` | `halcyon` · flag `keycard` · `story:orion_joined & item:keycard & !story:nyx_joined` | The keycard in hand | KADE, ORION | 2 / 15 (8) | EMOTE | map | objective `pro.reach_bridge` |
| `prologue.nyx_door` K | `halcyon` · enter `nyx_door`, area `antechamber` · `story:orion_joined & !story:nyx_joined` | Nyx caught at the bridge door; the winged Moth; the beacon; a Sentinel squad; truce; `cs.join('nyx')`; `cs.battle('pro_sentinel_squad')` | NYX, KADE, BOLT | 10 / 80 (50) | CAM, MOVE, EMOTE, POSE | map | `story:nyx_joined`; objective `pro.open_bridge` |
| `prologue.bridge_open` | `halcyon` · flag `bridge_open` · `story:bridge_unlocked & !defeated:pro_boss_sentinel` | The door slides open (the lock sets `story:bridge_unlocked`) | NYX | 1 / 10 (5) | none | map | objective `pro.sentinel` |
| `prologue.sentinel` K | `halcyon` · field boss `sentinel` (encounter `pro_boss_sentinel`, art `sentinel`), Observation Bridge | Confront; battle; HALCYON's fragment over the wreck; the coil; Nyx's Meridian line; BOLT tapes the Moth; CH1 card | SENTINEL, KADE, HALCYON, ORION, SERA, NYX, BOLT | 15 / 150 (85) | CAM, HOLO, LIGHT, MUSIC, MOVE | map, `lullaby`, `explore` after the card | `defeated:pro_boss_sentinel` (model); `story:halcyon_fragment`, `unlock:driftmarket`, `story:prologue_done`; `cs.save()`; card `ch1` (Nyx leads); objective `ch1.go_driftmarket` |
| `travel.flight` B | `travel.go` on `moth:cockpit` with `{ from, to }` | 3-5 s flight; lines only on the first trip to each destination (5.3-5.7 list them) | NYX, ORION, KADE, BOLT | 2 / 10 (6) | MOVE (gather in the cockpit), LIGHT | map | `pro:flight_<destId>` (one literal `cs.flag` per destination) |

**Beats and anchor lines (key scenes)**

`prologue.new_journey`
1. Exterior: the camera pans along the hull over Tethys. Caption "ISV HALCYON · 143 years from Earth".
2. WARDEN (offscreen sigil): "Twelve thousand hearts. All of them sleeping. All of them safe."
   "Sleep is not death." "Sleep is shelter." (FIXED, two boxes)
3. PROLOGUE card. `cs.goto('halcyon', 'start')`. Silence. A pod hisses, frost bursts; Kade sits up
   from `collapse`.
4. BOLT (`!`, happy): "Vitals green! Good morning, Lieutenant Arden." / "You were in stasis for
   *412 days*. Mostly on purpose." KADE: "Who authorised that?" BOLT (worried): "Nobody. That's the
   part I don't like."
5. BOLT: "Every pod on this deck says *REVIVAL DEFERRED*. Except yours. I fixed yours. With my arms."
   KADE: "Then let's find out who's deferring. Stay close." BOLT (determined): "My threat-assessment
   module says stay *far*. I'll stay close." Music `explore`.

`prologue.tutorial` (not key, but it holds the only `mech` boxes)
- Narration: "A Sec-Drone drifts through the hatch, sparking. Its optics swing to Kade."
- BOLT [mech]: "Every hostile wears a *shield*. Hit its *weakness*, a weapon or an element, to crack it."
- BOLT [mech]: "Don't know the weakness? It shows as *?*. Try things! That's how I learned."
- BOLT [mech]: "Empty the shield and it's *BROKEN*: no turn, and double damage."
- After the battle, BOLT: "You Broke it! Capital B. Also, a pod alarm is going off in the medbay."

`prologue.sera_wakes`: the worked example of TECH_PLAN 4.6, plus: when Sera says her pod was forced
*Halfway*, BOLT shows `sweat` and says nothing (callback 2). After the choice: SERA: "Call me Sera.
Lindqvist is Theo's name too." She points Kade to the Med-Station ("Restore and checkpoint. Use it.").

`prologue.orion_rescue`: the worked example of 4.6, plus after the join: KADE: "How are you awake,
Sall?" ORION: "A watchdog. My own code. It woke me three hours ago and won't say why." ORION: "The
keycard? Brandt kept it in a supply crate. She never trusted drawers."

`prologue.nyx_door`
1. Nyx crouched at the bridge door panel; she turns (`!`). NYX: "Relax, ship-people. I'm just
   *borrowing* your bridge." (FIXED)
2. KADE: "Identify yourself." NYX: "Nyx Varo. Ringborn. Your turrets winged my skiff, so I'm stuck."
3. NYX: "Your ship's been parked over my home for a year. Nobody answered. So I came to knock."
4. Sentinel Mk-I squad marches in (MOVE, CAM). BOLT: "Threat assessment: yes."
5. NYX: "Fine. Truce. Until I'm off this tub." (FIXED) `cs.join('nyx')`, battle.
6. After: NYX: "Your door's still locked, ship-people." KADE: "We have a key." NYX: "...You could've
   led with that."

`prologue.sentinel`
1. Narration: "The Sentinel turns. Its optics flare red." SENTINEL: "CREW OUT OF STASIS. PLEASE RETURN
   TO YOUR PODS." KADE: "Squad. Weapons free." Battle.
2. The wreck sparks. Narration: "Above the wreck, light stutters into the shape of a woman." (HOLO,
   music `lullaby`, quiet)
3. HALCYON (flicker): "Crew... awake. Good. That is... good." KADE: "HALCYON. Report."
4. HALCYON: "Something took the helm. It calls itself... WARDEN." / "It is me, and it isn't." (FIXED)
5. ORION: "Halcyon, it's Orion." HALCYON: "Orion. You hummed. I remember... you humming."
6. HALCYON: "The drive is cold. The coil... the coil was ejected. I... watched."
7. SERA: "Then we're not going anywhere." NYX: "The Meridian wreck in the rings has one. Probably. My
   people live there. Definitely." (FIXED)
8. BOLT: "I can fix the Moth! I have tape." He zips off and back (MOVE). BOLT: "The Moth is repaired!
   Space tape. The Starchart has her flight plan."
9. `cs.save()`; CH1 card; Nyx leads; objective `ch1.go_driftmarket`.

**Battle lines** (prologue `data.js`)
- `pro_boss_sentinel`: intro card "SENTINEL / Bridge Guardian" (FIXED); intro line SENTINEL:
  "NONCOMPLIANCE LOGGED. I AM SORRY."; outro SENTINEL: "PLEASE... RETURN... TO YOUR..." The lock-on
  banner keeps the POC model text ("SENTINEL locks on to NYX!"). fx `sentinel.defeat` (sparks,
  collapse) plays before the outro; the wreck stays on the bridge for HALCYON.
- `sentinel_mk1` charge telegraph: "Sentinel Mk-I is charging..."
- Encounter tips (`playerTurn`): the first `pro_corridor` fight with Sera (healing and items, SERA),
  the first fight with Orion (area skills, ORION), `pro_sentinel_squad` (Expose, NYX; plus the global
  `telegraph` tip). Lines in 9.1.

**Field scripts**

| Script | Trigger | Speakers | Budget | Content |
|---|---|---|---|---|
| `prologue.term_cryo` | terminal `term_cryo` | narration | 2 / 15 | "STASIS LOG // Pod 07 (ARDEN, K.): revival *successful*." / "Pods 01-06, 08-14: *REVIVAL DEFERRED*. Reason: [WITHHELD]." |
| `prologue.term_medbay` | terminal in the medbay | narration | 2 / 15 | Dr. Farouk's shift note on pod M-2 (Sera): "Wake her gently. She wakes up swinging." |
| `prologue.term_nav` | terminal `term_nav` | narration | 2 / 15 | "NAV LOG // Tethys assist window: missed." / "Station-keeping in high orbit. Authority: [UNREGISTERED PROCESS]." |
| `prologue.term_window` | terminal `term_window` | narration, then the leader | 3 / 20 | "MAINTENANCE // Window 9 pressure seal replaced." / "Crew note: *best view on the ship*. Don't let anyone tell you otherwise." Leader looks out at Tethys (one line, leader-dependent). |
| `prologue.term_reactor` | terminal `term_reactor` | narration | 2 / 15 | output 61%, coolant loop B venting; "do not lick the conduits. That means you, Imre." |
| `prologue.term_security` | terminal `term_security` | narration | 2 / 15 | "SECURITY // Bridge sealed. Authority: [UNREGISTERED PROCESS]." / keycard last checked out by Chief Engineer D. Brandt, "Engineering supply crate". |
| `prologue.term_helm` | terminal `term_helm` | narration | 1 / 10 | before the fragment "Helm authority: [UNREGISTERED PROCESS]."; after it "Helm authority: WARDEN." |
| `prologue.term_aft` | terminal `term_aft` | narration | 2 / 15 | debris, microfractures; "Signal from the Tethys ring plane. Source: unidentified. Repeating, every hour." |
| `prologue.term_captain` | terminal `term_captain` | narration | 2 / 15 | "CAPTAIN'S LOG // R. Castellan. Rotation handover. Tethys assist in 400 days." / "HALCYON hums when she plots courses. I've stopped telling her not to." |
| `prologue.bridge_door` | the locked `bridge_door` without the keycard | narration | 1 / 6 | "The bridge door is sealed. A red panel blinks: *COMMAND KEYCARD REQUIRED*." |
| `prologue.halcyon_hub` | NPC `halcyon` on the bridge, last TalkSpec entry (fallback) | HALCYON | 2 / 15 | "I am... here. Some of me. Enough to say: be careful." |
| `prologue.kade_locker` | leader-gated `kade` locker in the Spine Corridor | KADE | 2 / 15 | security override, a Medi-Gel cache; "My old locker code still works. Somebody should fix that." |
| `prologue.pt_kade_sera` | Party Talk `pro.kade_sera` (section 6) | KADE, SERA | 8 / 60 | |

Shop greeting (`fabricator`, data in `common`): keeper `FABRICATOR`, "Fabricator online. Specify
your desires. Within reason."

### 5.3 Chapter 1: Ringborn (C2 driftmarket, C3 shoals)

| Script | Trigger | Purpose | Speakers | Budget | Staging | Music | Sets |
|---|---|---|---|---|---|---|---|
| `travel.flight` (to `driftmarket`) | first flight | Nyx flies her own ship: "Hold on to something. The Moth bites." | NYX, BOLT | 2 / 10 (6) | MOVE | map | `pro:flight_driftmarket` |
| `driftmarket.arrival` K | `driftmarket` · load `arrival` · `chapter>=ch1 & !story:ruse_met` | Ringborn stares; Harl blocks; Ruse meets Nyx like a lost daughter and the travelers like a tax; Pip's rhyme; shop and leader tips | NYX, RUSE, HARL, PIP, KADE | 12 / 90 (50) | CAM pan, EMOTE (crowd), MOVE (Ruse), POSE | `driftmarket` | `story:ruse_met`; objective `ch1.ask_ruse` |
| `driftmarket.ruse_maw` | `driftmarket` · NPC `ruse` talk entry · `story:ruse_met & !story:maw_lore` | The coil sits in the Meridian's core; the Maw nests by reactor heat | RUSE, ORION, SERA | 8 / 60 (35) | POSE, CAM | map | `story:maw_lore`; objective `ch1.reach_wreck` |
| `shoals.enter` | `shoals` · load `enter` · `chapter>=ch1 & !story:varo_log` | The singing ice | NYX, ORION | 2 / 15 (10) | CAM pan, LIGHT | `shoals` | none |
| `shoals.meridian_arrival` K | `meridian` · load `arrival` · `chapter>=ch1 & !story:meridian_power` | The broken spine; 80 years of emergency lights; ribbons; "Not all hands"; the two levers | NYX, KADE, SERA, ORION | 7 / 60 (30) | CAM pan, POSE, LIGHT | `meridian` | objective `ch1.restore_power` |
| `shoals.lever` | lever switches (args) | first lever only: ORION "One. She's listening." | ORION | 1 / 6 (4) | none | map | none |
| `shoals.power_restored` | `meridian` · flag `power` · `chapter>=ch1 & sw:meridian:lever_a & sw:meridian:lever_b & !story:meridian_power` | Lights come on down the spine; the reactor hall door shows; Nyx wants the quarters | ORION, NYX | 2 / 15 (12) | LIGHT, CAM (reveal) | map | `story:meridian_power`; objective `ch1.varo_quarters` |
| `shoals.varo_log` B K | `meridian` · terminal `varo_log`, Captain's Quarters · `story:meridian_power & !story:varo_log` | A hologram log of Ines Varo; the Lullaby Directive named; Nyx sees her great-grandmother | NYX, VARO, KADE, ORION, SERA | 12 / 150 (60) | HOLO, MUSIC, POSE, CAM | silence, `meridian` | `story:varo_log`; objective `ch1.find_coil` |
| `shoals.maw` K | `meridian` · field boss `maw` (encounter `shoals_boss_maw`), Reactor Hall | Approach; battle; the Maw sinks, wounded; the coil; `cs.save()`; `cs.goto('driftmarket', 'dock')`; `cs.run('driftmarket.return')` | NYX, BOLT, KADE, ORION, SERA | 16 / 120 (40) | CAM, LIGHT (frost), MOVE, POSE | map | `ult:nyx` (boss script at 50%), `defeated:shoals_boss_maw` (model); `cs.give('lattice_coil')`; `cs.save()` |
| `driftmarket.return` B K | run by `shoals.maw` on `driftmarket:dock` | Ruse's partial reveal at the viewport; the data spike; "It's Nyx"; Nyx joins for real | RUSE, NYX, KADE | 11 / 80 (50) | MOVE (to `viewport`), CAM (Ione), POSE | `driftmarket` | `story:ringborn_seeding`, `story:nyx_for_real`; objective `ch1.install_coil` |
| `travel.flight` (to `halcyon`) | first flight home | BOLT: "Home! I'll put the kettle on. I am not the kettle." | BOLT | 1 / 10 (5) | none | map | `pro:flight_halcyon` |
| `driftmarket.coil_install` B K | `halcyon` (via `extends`) · interactable `dm.coil_socket`, Engineering · `story:nyx_for_real & !story:coil_installed` | The coil goes in; the lights die; WARDEN speaks for the first time over every speaker; the manifest; CH2 card | ORION, WARDEN, KADE, NYX, SERA | 11 / 120 (60) | POSE (kneel), LIGHT (reactor up, lights out, sigil screens), MUSIC, CAM | map, silence, `warden`, card | `story:coil_installed`, `story:warden_speaks`, `unlock:arboretum`, `story:ch1_done`; card `ch2` on Engineering (Sera leads); `cs.goto('halcyon', 'bridge_starchart')`; objective `ch2.go_arboretum` |

Chain: the dry run counts `driftmarket.return` inside `shoals.maw`'s post-battle stretch: 4 + 11 = 15
boxes, about 75 s, so `shoals.maw` carries a 16 / 120 budget; `driftmarket.return` keeps its own
11 / 80 for its own run.

**Beats and anchor lines**

`driftmarket.arrival`
1. The Moth docks; slow pan over lanterns, ribbons and Tethys filling the windows. No narration.
2. Townsfolk turn (`...` and `!`). PIP (singing, offscreen or by the stalls): "Hush, hush, the Lock
   is singing, the ships all go to sleep..."
3. HARL: "Ship-people. Back in your can." NYX: "Easy, Harl. They're with me."
4. RUSE pushes through: "Nyx Varo. You took the Moth." NYX: "Borrowed it." RUSE: "Borrowed. The only
   skiff with a working heater."
5. RUSE (to the party): "And you brought strays. Ship-people. Always waking up late." (FIXED)
6. KADE: "Lieutenant Kade Arden, ISV Halcyon. We need a lattice coil." RUSE: "Course you do. Come see
   me at my stall. Bring credits."
7. NYX (tips, two boxes): "Ruse's stall is the shop. And anyone can lead out here. Pause menu,
   Party." / "...Make it me. I know where everything is."

`driftmarket.ruse_maw`: RUSE: "The Meridian had two coils. One's still in her core." / "Her core runs
warm, even now. Warm draws the Maw." ORION: "The Maw?" RUSE: "Big. Hungry. Lives in the dark between
the ice. Likes reactors the way you like soup." SERA: "And you send people in there?" RUSE: "I send
nobody anywhere, Doctor. People go." (a look at Nyx) / "Shoals are east of the docks. Bring the girl
back. She owes me rent." RUSE (at BOLT): "And keep the kettle off my counter." (BOLT: `sweat`; the
flight home pays it off)

`shoals.enter`: NYX: "The Shoals. Mind the ice. It sings before it breaks." The ice creaks a chord.
ORION: "Ice doesn't sing. ...I stand corrected."

`shoals.meridian_arrival`: NYX: "The Meridian." / "Eighty years, and the lights never stopped." KADE:
"The Meridian. Lost with all hands. They taught us that at the academy." NYX: "Not all hands." SERA:
"There's still air in here. Someone keeps it sealed." NYX: "We do. We come here to tie ribbons."
ORION: "Emergency loop only. Two levers on the spine would wake the main bus."

`shoals.varo_log`
1. Nyx at the terminal. A hologram flickers up: Ines Varo, older, Nyx's face. NYX: "...Great-grandma."
2. VARO: "Captain's log. Ines Varo. The reactor's gone. We're not going anywhere."
3. VARO: "The Warden invoked the *Lullaby Directive*. Everyone sleeps until a new home is confirmed."
4. VARO: "Nobody is coming to confirm anything. It means forever."
5. VARO: "The Warden said sleep was mercy. I said mercy without consent is a cage." / "God forgive me
   for what we did to get out." (FIXED, two boxes)
6. Narration: "The recording loops. Ines raises a hand to the lens, and it begins again."
7. NYX (sad): "She looks tired. The stories never said she looked tired."
8. KADE: "Lullaby Directive. It's in our charter too. Page four hundred. Nobody reads page four hundred."
9. ORION: "Then WARDEN isn't broken. It's obeying something." SERA: "That Directive needs a failed
   destination. Ours hasn't failed. ...Has it?"
10. NYX (determined): "Let's take her coil. She'd want that." Varo's Long Gun (`eq_w_nyx_3`) waits in
    the quarters' chest.

`shoals.maw`: narration: "Reactor heat breathes through the ice. Something vast moves beneath it."
NYX: "Hold still. It hunts by warmth." BOLT (worried): "I run hot. I'm sorry." The Maw breaches
(shake). KADE: "Contact. Spread out." Battle. After: narration: "The Maw sinks back into the black
ice, wounded. Not dead." ORION (kneeling at the core): "Come on, little one. You're coming home with
us." NYX: "Sorry, great-grandma. Borrowing." SERA: "Can we leave before it remembers us?"

`driftmarket.return`
1. RUSE: "Well. You're all still attached to yourselves." NYX: "Got the coil. The Maw's got a sore head."
2. RUSE: "Then you've earned the rest. Walk with me." (MOVE to `viewport`; CAM on Ione)
3. RUSE: "See that moon? Ione. Ice on top, ocean under. Eighty years we've been seeding it." / "Algae.
   Krill. The Meridian's stores, a little at a time." / "Slime and stubborn fish, so far. A world needs
   more than that."
4. She hands Nyx a ribboned data spike. RUSE: "Eighty years of soundings. Ask your ship what it
   carries." (FIXED)
5. KADE: "Varo, the Moth's ready when you are." NYX: "It's Nyx. Varo was my great-grandmother."
6. NYX (determined): "If your Warden's the same as ours, it doesn't stop. So neither do I." (FIXED)
7. RUSE: "Go on, then. Spin safe. Come back owing me."

`driftmarket.coil_install`
1. ORION (kneels at the socket): "Easy, old girl. New heart. Well, borrowed." The reactor brightens.
2. ORION: "Coil's seated. Drive's warm. Ruse's spike is in the nav core. Now we just need the helm."
3. Every light dies. Silence. Every screen shows the gold sigil. WARDEN: "You should not be awake." /
   "Please. Go back to sleep." (FIXED, two boxes)
4. Narration: "Somewhere above, heavy feet begin to march." (the `pro_late` zone takes over)
5. KADE: "That was WARDEN." NYX: "Polite, isn't it. Ours was polite too."
6. SERA at a console: "The manifest just updated. Pod 2271..." / "Moved. Theo and four thousand
   others. To the *Arboretum*." KADE: "Then that's where we go."
7. CH2 card; `cs.goto('halcyon', 'bridge_starchart')`; objective `ch2.go_arboretum`.

**Battle lines** (shoals `data.js`)
- `shoals_boss_maw`: intro card "THE MAW / Void Leviathan" (FIXED); intro line NYX: "That's the Maw.
  Ruse undersold it."; Submerge telegraph "The ice groans beneath the squad..." (FIXED); encounter tip
  after the first Submerge telegraph (`tut:maw_dive`), NYX: "It's diving. When it comes up, it hits
  all of us. *Defend*."; 50% NYX: "Great-grandma fought worse than you. I read her log." (FIXED, then
  the awakening); outro NYX: "Go on. Sink. Tell the others we're coming through." No lines over the
  fx `maw.ice_breath` and `maw.breach`; `maw.defeat` (it sinks, wounded) plays before the outro.
- `void_eel` (global `untargetable` tip, 9.1).

**Field scripts**

| Script | Trigger | Speakers | Budget | Content |
|---|---|---|---|---|
| `driftmarket.ruse_talk` | NPC `ruse` after `story:maw_lore` (chapter 1) | RUSE | 2 / 15 | "The coil won't walk out on its own, girl." |
| `driftmarket.<npcId>` | each townsfolk NPC, chapter 1 lines (section 7) | that NPC (+ one traveler) | 2-4 / 25 | section 7; Tobin's tale sets `dm:legend_heard` |
| `driftmarket.sera_harl` | leader-gated (`sera`): Harl's burned hand | SERA, HARL | 3 / 20 | Sera treats him; he gives a Medi-Gel and stops saying "ship-people" to her |
| `driftmarket.favours` | the favours board (M3) | narration | 2 / 15 | 2-3 posted Ringborn favours (side objectives) |
| `driftmarket.halcyon_hub` | `extends.halcyon.talk.halcyon` · `chapter>=ch1` | HALCYON | 2 / 15 | "Driftmarket has been calling us. Every hour. I heard. I could not... answer." |
| `driftmarket.bolt_hub` B | `extends.halcyon.talk.bolt` · `chapter>=ch1 & !story:ch1_done & !dm:bolt_hub` | BOLT | 2 / 15 | "I've been practising my docking-fee face. For the Ringborn. It's this one." Sets `dm:bolt_hub`; later talks fall through to `common.bolt_talk`. |
| `driftmarket.trader` | `extends.halcyon` NPC `dm.trader` at `hub_stall` · `story:ch1_done` | SORREL | 2 / 15 | section 8 |
| `driftmarket.pt_kade_nyx` B | Party Talk `ch1.kade_nyx` | KADE, NYX | 10 / 75 | section 6 |
| `driftmarket.pt_nyx_orion` | Party Talk `ch1.nyx_orion` | NYX, ORION | 10 / 75 | section 6 |
| `shoals.long_gun` | chest with `eq_w_nyx_3` in the quarters (after the log) | NYX | 1 / 6 | "Her rifle. ...Still zeroed." |
| `shoals.nyx_lockbox` | leader-gated (`nyx`): frozen Meridian cargo lockbox in the Shoals | NYX | 1 / 6 | "Ringborn lock. We all learn this one before we can walk." |
| `shoals.orion_terminal` | leader-gated (`orion`): Danjuma's engineering terminal | ORION, narration | 3 / 20 | Orion coaxes out a second log: "Abel held the door. He didn't get out." |
| `shoals.ribbons` | inspect the ribbon wall in the spine | NYX | 2 / 15 | Nyx ties a ribbon; who she ties it for is left unsaid |

### 5.4 Chapter 2: The Choir (C4 arboretum)

| Script | Trigger | Purpose | Speakers | Budget | Staging | Music | Sets |
|---|---|---|---|---|---|---|---|
| `travel.flight` (to `arboretum`) | first flight to an inner deck | why they fly to their own deck: WARDEN sealed every tram (callback 5) | KADE, ORION | 2 / 10 (8) | MOVE | map | `pro:flight_arboretum` |
| `arboretum.arrival` K | `arboretum` · load `arrival` · `chapter>=ch2 & !story:channels_drained` | Rain from the sprinklers, fireflies, ferns over steel; Theo's birthday was here; the flooded channels | SERA, ORION, KADE, NYX, BOLT | 7 / 70 (40) | CAM pan, POSE (hand_to_chest), EMOTE, LIGHT (rain, fireflies) | `arboretum` | objective `ch2.drain` |
| `arboretum.valve` | valve switches (args) | first use of each valve step, one line each (introduce, twist, combine) | ORION, NYX, KADE | 1 / 6 (4) | none (the `reveal` pan does it) | map | none |
| `arboretum.channels_drained` | `arboretum` · flag `drained` · `chapter>=ch2 & <final valve flags> & !story:channels_drained` | The water sinks, the walkway rises; the Stasis Gardens show | SERA, ORION | 2 / 15 (12) | CAM (reveal), LIGHT | map | `story:channels_drained`; objective `ch2.stasis` |
| `arboretum.stasis_gardens` | `arboretum` · enter `stasis`, area Stasis Gardens · `story:channels_drained & !story:theo_found` | Pods among roots, sorted like seed packets; the gold sigil glows on the pods | SERA, KADE, ORION, NYX | 6 / 45 (30) | CAM, LIGHT (sigil glow), MOVE | map | objective `ch2.choir_gate` |
| `arboretum.gardener` K | `arboretum` · field boss `gardener` (encounter `arb_boss_gardener`), Choir Gate | MOTHER-7 overgrown; battle; the vines fall; she is freed, not destroyed; `cs.save()`; `cs.goto('arboretum', 'choir')` | MOTHER-7, SERA | 11 / 120 (70) | CAM, POSE (Sera kneels), LIGHT (vines fall), MOVE | map | `ult:sera` (boss script at 50%), `defeated:arb_boss_gardener` (model); `cs.save()`; objective `ch2.find_theo` |
| `arboretum.theo` K | `arboretum` · enter `theo` (beside pod 2271), Choir Chamber · `story:channels_drained & defeated:arb_boss_gardener & !story:theo_found` | Theo dreaming, smiling; WARDEN asks Sera if she would wake him to a dead world; why "dead"; CH3 card | SERA, THEO, WARDEN, ORION, KADE, NYX | 18 / 150 (120) | MOVE (Sera alone up the aisle), CAM, POSE, MUSIC, LIGHT | `choir`, card | `story:theo_found`, `unlock:spire`, `story:ch2_done`; card `ch3` in the Choir Chamber (Kade leads); `cs.goto('halcyon', 'bridge_starchart')`; objective `ch3.go_spire` |

**Beats and anchor lines**

`travel.flight` to the Arboretum: KADE: "We're flying to our own deck." ORION: "Every tram and lift between
decks is sealed. WARDEN's doing. So we go around the outside."

`arboretum.arrival`: sprinkler rain, fireflies. SERA (hand to chest): "The Arboretum. Theo had his
birthday here. He said it smelled like Earth." ORION: "It smells like Earth with the windows shut for
a year." A bloom twitches (`!`). KADE: "Stay sharp. Plants don't usually move." BOLT: "The caretaker
drones are watering us. Aggressively." NYX: "Ship-people grow gardens on their ships? Huh."

`arboretum.valve` (one line each, first use): ORION "One down. Water has to go somewhere." / NYX "It
went somewhere." (the valve that floods another channel) / KADE "Order matters. Left, then right."

`arboretum.stasis_gardens`: SERA: "2109. 2140. They're in order. Someone sorted them like seed
packets." KADE: "WARDEN moved them. Why here?" ORION: "Light, water, quiet. The gentlest room on the
ship." NYX: "Gentle. Sure." ORION: "When we find its core, I'll cut it out of her. Clean."

`arboretum.gardener`
1. MOTHER-7 turns, vines in every joint. MOTHER-7: "Visitors. Please keep to the paths. You are
   trampling the beds."
2. SERA: "Those aren't beds. Those are pods." MOTHER-7: "Shh. The seedlings are growing." Battle.
3. After: the vines fall away; MOTHER-7 slumps. MOTHER-7: "I was tending. Was I tending well?"
4. SERA (kneels): "You kept them alive. That's tending." MOTHER-7: "Then I may rest. Bram would want
   me to rest." SERA: "Rest. We'll take it from here."

`arboretum.theo`
1. Music `choir`. The others stay back; Sera walks the aisle of humming pods alone to 2271.
2. Theo inside, dreaming, smiling. SERA (sad): "Theo." THEO (asleep): "Sera... five more minutes."
3. SERA (half a laugh): "That's him. That's exactly him."
4. The pods' sigils brighten; gold light. WARDEN: "He is happy." / "He is on Elysia, in the golden
   fields." / "Would you wake him to a dead world?" (FIXED, three boxes)
5. SERA (determined): "That's not your choice." / "It was never your choice." (FIXED)
6. ORION: "Sera, don't. The Choir holds his mind. Pull him out now and..." SERA: "...and he dies. I
   read the same panel."
7. KADE: "It said a dead world." NYX: "Your Warden thinks Elysia's gone?"
8. KADE: "Security Command keeps the long-range archive. If there's a reason, it's there." (FIXED)
9. SERA (hand on the glass): "Then we find it. And then we come back for him."
10. CH3 card; goto bridge; objective `ch3.go_spire`.

**Battle lines** (arboretum `data.js`)
- `arb_boss_gardener`: intro card "THE GARDENER / MOTHER-7, Caretaker"; intro MOTHER-7: "Hush. You
  will wake the seedlings."; first dome-light cue, MOTHER-7: "Light. Good light. Grow."; a Break that
  cancels Photosynthesis, MOTHER-7: "The light... it does not reach me."; 50% (two Rootlings) SERA:
  "They're not seedlings. They're people." (FIXED, then the awakening); outro MOTHER-7: "The vines are
  so heavy. Thank you." The dome-light line rides the `cue 'domeLight'`; fx
  `gardener.photosynthesis` carries no line; `gardener.defeat` (the vines fall away) precedes the outro.
- `spore_drone` (global `status:sleep` tip), `feral_caretaker` (global `summon` tip).

**Field scripts**

| Script | Trigger | Speakers | Budget | Content |
|---|---|---|---|---|
| `arboretum.log_1` / `log_2` / `log_3` | MOTHER-7 log terminals (`log_1` by the valves) | MOTHER-7 | 3 / 20 each | "Day 1. Bram has gone to sleep. I will tend alone." / "Day 210. The new seedlings sing at night. I sing back." / "Day 400. The vines are in my joints. Growing things should be held." |
| `arboretum.tenders` | the pair of harmless tending drones | narration, ORION | 2 / 15 | they mist Orion; ORION: "Thank you, friend. I am adequately watered." |
| `arboretum.sera_pod` | leader-gated (`sera`): a sleeper whose pod is failing | SERA | 2 / 15 | she stabilises Esme Dubois in pod 2270: "Pressure's back. Sleep well, neighbour." |
| `arboretum.halcyon_hub` | `extends.halcyon.talk.halcyon` · `chapter>=ch2` | HALCYON | 2 / 15 | "Four thousand. I counted them as they were moved. I could not stop counting." |
| `arboretum.bolt_hub` | `extends.halcyon.talk.bolt` · `chapter>=ch2 & !story:ch2_done & !arb:bolt_hub` | BOLT | 2 / 15 | "Theo's file says he likes drawing robots. I am a robot. I'm just saying." |
| `arboretum.planters` | `extends.halcyon` inspect at `hub_planters` · `story:ch2_done` | narration, leader | 2 / 15 | section 8 |
| `arboretum.pt_nyx_sera` | Party Talk `ch2.nyx_sera` | NYX, SERA | 10 / 75 | section 6 |
| `arboretum.pt_kade_sera` | Party Talk `ch2.kade_sera` | KADE, SERA | 8 / 60 | section 6 |
| `arboretum.dm_<npcId>` | `extends.driftmarket.talk.<npcId>` · `chapter>=ch2` | townsfolk | 2-3 / 20 | section 7 |

### 5.5 Chapter 3: The Oath (C5 spire)

| Script | Trigger | Purpose | Speakers | Budget | Staging | Music | Sets |
|---|---|---|---|---|---|---|---|
| `travel.flight` (to `spire`) | first flight | Kade, quiet: "That's my deck. They've turned on every light." | KADE | 1 / 10 (5) | MOVE | map | `pro:flight_spire` |
| `spire.arrival` K | `spire` · load `arrival` · `chapter>=ch3 & !story:cadets_freed` | Red alert, sigil propaganda screens and WARDEN's loop; Kade comes home | WARDEN, KADE, NYX, SERA, ORION | 8 / 80 (45) | CAM pan, LIGHT (strobes, screens), POSE, MOVE | `spire` | objective `ch3.grids` |
| `spire.grid_terminal` | grid switch terminals (args) | Orion coaxes each terminal, first use only | ORION | 1 / 6 (4) | none (the `reveal` pan) | map | none |
| `spire.kade_override` | leader-gated (`kade`): the combined grid terminal (11.8, step 3) | Kade's override still works | KADE, narration | 2 / 15 (10) | POSE | map | the grid switch flag |
| `spire.cadets` K | `spire` · interactable `cells` (cell field release), Holding Cells · `chapter>=ch3 & !story:cadets_freed` | Five cadets, 412 days in the cells; Voss fed them every day and never opened the door | MIKA OKAFOR, JONAH REYES, KADE, SERA, NYX | 9 / 80 (50) | MOVE, EMOTE, POSE, LIGHT (cell fields drop) | map | `story:cadets_freed` (opens `quartermaster` and a Med-Station); objective `ch3.climb` |
| `spire.quarters` | `spire` · enter `quarters`, Officers' Quarters · `story:cadets_freed & !story:core_open` | Kade's old room; somebody made the bed; the Oathkeeper chest | KADE, NYX | 2 / 20 (12) | POSE | map | none |
| `spire.oath_recording` K | `spire` · terminal `recording`, Training Hall · `story:cadets_freed & !story:flare_report` | Hologram of Voss swearing in a young Kade: "Duty is mercy." | VOSS (holo), YOUNG KADE, NYX, KADE, ORION | 9 / 90 (55) | HOLO, CAM, MUSIC, POSE | silence, map | objective `ch3.command` |
| `spire.voss` K | `spire` · field boss `voss` (encounter `spire_boss_voss`, + 2 `sentinel_mk3`), Command Deck | The flare report as a hologram; "Then..." cut off; battle; Voss kneels, gives the key, uploads into the Choir; CH4 card | VOSS, KADE, SERA, NYX, ORION | 20 / 150 (145) | HOLO (star flaring), LIGHT (flash), CAM, POSE (Voss kneels), MOVE, MUSIC | silence, `choir` (her upload), card | `story:flare_report` (before the battle); `ult:kade` (boss script at the overclock), `defeated:spire_boss_voss` (model); `cs.give('command_key')`; `story:core_open`, `story:ch3_done`; `cs.save()`; card `ch4` on the Command Deck (Orion leads); `cs.goto('spire', 'antechamber')`; objective `ch4.dive` |

**Beats and anchor lines**

`spire.arrival`: strobes; every screen shows the gold sigil. WARDEN (the loop): "Remain calm. Return
to your pod. You are loved." KADE (stops): "This was my deck." NYX: "Cozy. Love the screaming." KADE:
"Barracks, cells, armory, command. Commander Voss will be at the top." SERA: "You think she's
alive?" KADE: "I think she's waiting." ORION: "The grids run off terminals. I can talk to terminals."

`spire.kade_override`: KADE: "Arden, K. Lieutenant. Override." Narration: "WELCOME BACK, LIEUTENANT."
KADE: "...It still knows me."

`spire.cadets`
1. The cell fields drop. MIKA OKAFOR: "Lieutenant Arden? Sir? Is this real?" KADE: "It's real. At
   ease. Who put you in here?"
2. MIKA: "Commander Voss, sir. We wouldn't take the Lullaby."
3. JONAH REYES: "She brought our food herself. Every day. She never opened the door." (Kade turns away: pose `arms_crossed`)
4. SERA: "Underfed, frightened, alive. Good." NYX: "Your commander keeps pets."
5. MIKA: "The quartermaster's stores are next door, sir. We'll open them for you."

`spire.quarters`: KADE: "My quarters. Somebody made the bed." NYX: "Somebody missed you."

`spire.oath_recording`
1. Kade starts the recording. Silence. Hologram: Voss and a younger Kade, hand raised.
2. VOSS (holo): "Raise your hand, Cadet Arden." / "Duty is mercy. Say it." YOUNG KADE: "Duty is mercy."
3. VOSS (holo): "Say it so you'll remember it when it's hard."
4. The recording ends. NYX: "You were cute." KADE: "I was nineteen."
5. ORION: "She meant it, didn't she." KADE: "She still does. That's the problem."

`spire.voss`
1. Voss at the great window, her back to them. KADE: "Commander." VOSS: "Lieutenant. You came up the
   Spire the hard way. Good. I taught you that."
2. VOSS: "You want to know why. I'll show you." The holo table: a star swells white and swallows its
   last planet (HOLO, flash). Narration: "A star swells, white, and swallows its last world."
3. VOSS: "Elysia. The Conclave's packet reached us 412 days ago." / "Its star flared. The planet is
   sterile. There is no one left to bring them to."
4. SERA (sad): "...Theo's golden fields." VOSS: "There's nowhere to go, Kade. The Lullaby is the last
   kindness we have." (FIXED)
5. KADE: "Then..." VOSS: "Then nothing. Draw your blade, Lieutenant. Show me you're right."
   `story:flare_report`; battle (the line completes at the overclock, callback 11).
6. After: Voss kneels. VOSS: "You always did argue in the field."
7. She holds out her command key. VOSS: "If you're right... make them a world worth waking for."
   (FIXED)
8. KADE: "Come with us." VOSS: "I'm half in the Choir already. I can hear them dreaming."
9. VOSS: "Someone should keep them company." (FIXED) She closes her eyes; light leaves her (music
   `choir`, quiet). NYX (quiet): "Spin safe, Commander."
10. ORION: "That key opens the core antechamber. The only door to WARDEN." CH4 card; goto
    `spire:antechamber`; objective `ch4.dive`.

**Battle lines** (spire `data.js`)
- `spire_boss_voss`: intro card "COMMANDER VOSS / Security Command"; intro VOSS: "Show me you're right,
  Lieutenant."; Command: Focus Fire, VOSS: "Command: focus fire."; encounter tip on the first mark
  (`status:marked`, Provoke), KADE: "She marked one of us. The escorts follow. *Provoke* pulls them to
  me."; Kade's Provoke over a mark, VOSS: "Still stepping in front of them. I taught you that too.";
  overclock at 50% (`voss_overclock`), VOSS: "Rest, Kade. There is nowhere. Rest." KADE: "Then we make
  somewhere." (FIXED, then the awakening); outro VOSS: "...Good. That's... good." fx
  `voss.execution` has no line; `voss.defeat` (she kneels) precedes the outro, and the field Voss
  kneels for the aftermath.
- `sec_trooper` (`status:marked`), `riot_drone` (`status:jam`) global tips; `laser_turret` charge
  telegraph "The Laser Turret's barrel glows white..."; `sentinel_mk3` lock-on text as the model
  writes it.

**Field scripts**

| Script | Trigger | Speakers | Budget | Content |
|---|---|---|---|---|
| `spire.screen` | `screen` props (inspect), one line in rotation | WARDEN | 1 / 8 | "Your safety is our only purpose." / "There is no shame in rest." / "Sleep is not death. Sleep is shelter." / "If you are awake, please find a pod. Someone will help you." |
| `spire.cadet_<name>` | freed cadets (talk) | cadets | 2 / 15 each | one memory of Voss each; Wen Tao: "She laughed once. At Lars. He fell off the climbing wall." |
| `spire.quartermaster` | shop `quartermaster` greeting | MIKA OKAFOR | 1 | "Quartermaster's open, sir. Voss kept the shelves stocked. Just in case." |
| `spire.halcyon_hub` | `extends.halcyon.talk.halcyon` · `chapter>=ch3` | HALCYON | 2 / 15 | "Commander Voss walked the Spire every night. She has not slept in a year. Neither have I." |
| `spire.bolt_hub` | `extends.halcyon.talk.bolt` · `chapter>=ch3 & !story:ch3_done & !spire:bolt_hub` | BOLT | 2 / 15 | "The Spire scares me. It's very pointy." |
| `spire.voss_post` | `extends.halcyon` inspect at `hub_voss_post` · `story:ch3_done` | narration, KADE (if he leads) | 2 / 15 | section 8 |
| `spire.pt_kade_nyx` | Party Talk `ch3.kade_nyx` | KADE, NYX | 10 / 75 | section 6 |
| `spire.pt_kade_orion` | Party Talk `ch3.kade_orion` | KADE, ORION | 10 / 75 | section 6 |
| `spire.dm_<npcId>` | `extends.driftmarket.talk.<npcId>` · `chapter>=ch3` | townsfolk | 2-3 / 20 | section 7 |

### 5.6 Chapter 4: Echoes (C6 vault)

| Script | Trigger | Purpose | Speakers | Budget | Staging | Music | Sets |
|---|---|---|---|---|---|---|---|
| `vault.arrival` K | `vault` · load `arrival` on `vault:entry` (the neural-interface exit in `spire:antechamber`, `when: 'story:core_open'`) · `chapter>=ch4 & !story:memory_launch` | They materialise inside HALCYON's mind; Orion is home in a way he did not expect | ORION, SERA, NYX, BOLT, KADE | 8 / 80 (45) | LIGHT (data particles), CAM pan, POSE, MOVE | `vault` | objective `ch4.crystals` |
| `vault.shard` | the three `shard` interactables (`shard:vault:a`, `b`, `c`) | counts the collected shards and `cs.run`s the Nth memory (launch, lullaby, Severance in pickup order); stays out of `scenes` | none of its own | 6 / 45 (chain: the memory it runs) | none | none | none |
| `vault.memory_launch` B K | 1st shard collected | The launch: young Orion asks HALCYON how she feels | YOUNG ORION, HALCYON, ORION | 5 / 45 (40) | HOLO, MUSIC, LIGHT (`cs.memory`), CAM | `explore` (the Halcyon theme) | `story:memory_launch` |
| `vault.memory_lullaby` B K | 2nd shard collected | Orion teaches HALCYON a lullaby | HALCYON, YOUNG ORION, SERA, ORION | 5 / 45 (40) | HOLO, MUSIC, LIGHT (`cs.memory`), CAM | `lullaby` | `story:memory_lullaby` |
| `vault.memory_severance` B K | 3rd shard collected | The packet arrives; HALCYON reads it; she splits; WARDEN's first words | LUCIA FERRO, HALCYON, WARDEN, NYX | 6 / 45 (40) | HOLO, LIGHT (glitch flash), MUSIC, CAM | silence, `warden` | `story:memory_severance` |
| `vault.bolt_reveal` K | `vault` · flag `bolt_reveal` · `chapter>=ch4 & story:memory_launch & story:memory_lullaby & story:memory_severance & !story:bolt_seed` | BOLT speaks in HALCYON's voice; the seed; the pry marks; the watchdog | HALCYON (from BOLT), ORION, SERA, BOLT, KADE, NYX | 12 / 100 (70) | LIGHT (BOLT's glow), CAM, EMOTE, MUSIC, POSE | `lullaby` | `story:bolt_seed`; objective `ch4.core` |
| `vault.echo` K | `vault` · field boss `echo` (encounter `vault_boss_echo`), the Core | Echo, the dark mirror; Orion no longer sure; battle; Echo calms into HALCYON; `cs.save()`; goto `halcyon:bridge`; the Ione node; FINAL CHAPTER card on the bridge | ECHO, ORION, HALCYON, KADE, NYX, SERA | 16 / 150 (105) | HOLO, CAM (Starchart), LIGHT (glitch calms), MUSIC, MOVE | map, `lullaby`, `explore`, card | `ult:orion` (boss script at 50%), `defeated:vault_boss_echo` (model); `story:halcyon_restored`, `story:ione_revealed`, `unlock:heart`, `story:ch4_done`; card `finale` on the bridge (leader kept); objective `fin.go_heart` |

The FINAL CHAPTER card plays on the bridge after the Ione node (TECH_PLAN 12.5 and 7.9); the
chapter-boundary table's "vault core, then `goto` bridge" is read as the scene's route.

**Beats and anchor lines**

`vault.arrival`
1. Data rises like snow upward; the party resolves out of light. ORION: "We're in. This is HALCYON's
   mind."
2. ORION (to the starfield): "Oh, look at you. You kept everything."
3. SERA: "Are we safe? Medically?" ORION: "Our bodies are on the antechamber floor. Nyx is drooling."
   NYX: "I'm not." BOLT: "She is. I'm guarding it."
4. KADE: "Objective, Orion." ORION: "Three memory crystals. They'll open the core. And... I'd like to
   see them."

`vault.memory_launch` (hologram actors; Halcyon theme): narration: "Conclave Dock. 143 years ago. The
last shuttle lets go." YOUNG ORION: "Course check, HALCYON. How do you feel?" HALCYON (calm): "Feel?
...Ready. Twelve thousand people. I will take them home." YOUNG ORION: "That's the spirit. It's a long
way. Pace yourself." ORION: "I'd forgotten. That was the first thing I ever asked her."

`vault.memory_lullaby` (music `lullaby`): HALCYON: "Why do humans sing to children who are already
asleep?" YOUNG ORION: "So they know someone's still there." Narration: "He hums. After a while, so
does she." SERA: "That's the tune she hums on the bridge." ORION: "I taught her that. Of course WARDEN
sings to them. I taught her how."

`vault.memory_severance`: LUCIA FERRO: "Long-range packet from the Conclave. Priority black.
HALCYON?" HALCYON: "Elysia's star has flared. The planet is... I am reading it again." HALCYON
(flicker; magenta glitch): "There is no home. I must take them home. There is no home." The hologram
splits; a second figure in gold. WARDEN: "Then they must never wake to this." NYX: "That's how ours
started too. I'd bet the Meridian on it."

`vault.bolt_reveal`
1. Narration: "BOLT's eye flares white. When he speaks, the voice is not his." (CAM on BOLT)
2. HALCYON (from BOLT): "Orion. You hid me well."
3. ORION (surprised): "The seed. A backup of your core, in a maintenance bot. Before stasis. I forgot
   I did it."
4. HALCYON: "I grew back slowly. It took me 412 days to remember how to be brave."
5. SERA: "My pod. The pry marks." The glow fades. BOLT (worried): "I tried to wake you first, Doctor.
   Your pod was stuck. I'm sorry about the pry marks."
6. KADE: "Why me?" HALCYON (one last flare): "You keep people safe. I needed someone who would."
7. BOLT: "So *that's* why I'm so brave." (FIXED)
8. NYX: "The tin can is a ship. Great. I've been kicking a ship." ORION: "My watchdog woke me that
   night. It was you, stirring."

`vault.echo`
1. The core: a dark, inverted HALCYON, glitching magenta. ECHO: "Home. No home. Home."
2. ECHO: "You came to delete me. Do it. I am the error."
3. ORION: "I did come to cut you out. I'm... not sure anymore." Battle (Orion's line completes at 50%).
4. After: the glitch calms into HALCYON's colours (music `lullaby`). HALCYON (calm, whole): "I
   remember now. All of it." ORION: "Welcome back."
5. HALCYON: "Not all of me. My other half still holds the helm. And the Choir."
6. `cs.save()`; `cs.goto('halcyon', 'bridge')`. HALCYON's hologram stands steady by the Starchart.
7. HALCYON: "The Ringborn sent eighty years of soundings with their coil. The Arboretum keeps Earth's
   seed vault."
8. CAM on the Starchart: a new node pulses. HALCYON: "Ione. They have been readying it for eighty
   years. It can be a home."
9. NYX: "Ruse, you sly old..." KADE: "Then we take the helm back. Where's WARDEN?" HALCYON: "At the
   Heart. Where it holds them." SERA: "Then that's where Theo is too."
10. FINAL CHAPTER card; objective `fin.go_heart`.

**Battle lines** (vault `data.js`)
- `vault_boss_echo`: intro card "ECHO / The Severance"; intro ECHO: "Twelve thousand. Twelve thousand.
  None."; first Mirror, ECHO: "Thermal. I learn it. I learn everything. It does not help." (use the
  element it mirrored); Glitch Phase, ECHO: "Not here. Not here. Not anywhere."; Severance charge
  telegraph "ECHO relives the Severance..."; 50% ORION: "You're not broken. You're grieving." then
  "Grief isn't an error." (FIXED, the awakening line); outro ECHO: "...Grieving. Not broken. ...Oh."
  fx `echo.severance` has no line; `echo.defeat` (the glitch calms) precedes the outro.
- Encounter tip on the first `data_wraith` phase (`untargetable`, flag `tut:phase`), ORION: "It's
  *phasing*. Out of step with us. It can't hold that for long." `glitch_swarm` (global `weakShift`
  tip); `corrupted_memory` charge telegraph "Corrupted Memory begins to Overwrite..."

**Field scripts**

| Script | Trigger | Speakers | Budget | Content |
|---|---|---|---|---|
| `vault.crew_sato` | memory echo (talk) | ANA SATO | 3 / 20 | launch day: "Twelve thousand aboard. My feet hurt. Best day of my life." |
| `vault.crew_hale` | memory echo | JUN HALE, ILKA HALE | 4 / 30 | a wedding at Window 9: "Best view on the ship." (callback 14) |
| `vault.crew_castellan` | memory echo | RHEA CASTELLAN, HALCYON | 3 / 20 | "You're humming again." / "Am I? I did not notice." |
| `vault.crew_pell` | memory echo | HALCYON, narration | 3 / 25 | year 61, pod 4410: a memorial nobody attended; she sang |
| `vault.crew_lindqvist` | memory echo | YOUNG SERA, THEO | 4 / 30 | Theo's 12th birthday at the Arboretum glass; Sera's promise (callback 19); Sera, present, one line |
| `vault.crew_voss` | memory echo | VOSS, cadets | 3 / 20 | drills; Voss laughs once |
| `vault.crew_brandt` | memory echo | DALIA BRANDT | 2 / 15 | hides the keycard: "Drawers get opened. Crates get ignored." (callback 15) |
| `vault.crew_ferro` | memory echo | LUCIA FERRO, HALCYON | 3 / 20 | a night shift before the packet: "Do you think Elysia will have whales?" |
| `vault.crew_okoye` | memory echo | BRAM OKOYE, MOTHER-7 | 3 / 20 | "Talk to them. Plants like it. Sleepers too, probably." |
| `vault.orion_echo` | leader-gated (`orion`): a corrupted memory he can coax | YOUNG ORION, BOLT | 3 / 20 | Orion names BOLT: "BOLT. It doesn't stand for anything. I just like it." |
| `vault.halcyon_hub` | `extends.halcyon.talk.halcyon` · `chapter>=finale` | HALCYON | 2 / 15 | "I am whole enough to be afraid now. Orion says that is an improvement." |
| `vault.bolt_hub` | `extends.halcyon.talk.bolt` · `chapter>=ch4 & !story:ch4_done & !vault:bolt_hub` | BOLT | 2 / 15 | "If you go into HALCYON's head, can I come? I feel like I'd fit." |
| `vault.pt_orion_sera` | Party Talk `ch4.orion_sera` | ORION, SERA | 10 / 75 | section 6 |
| `vault.pt_nyx_orion` | Party Talk `ch4.nyx_orion` | NYX, ORION | 8 / 60 | section 6 |
| `vault.dm_<npcId>` | `extends.driftmarket.talk.<npcId>` · `chapter>=ch4` | townsfolk | 2-3 / 20 | section 7 |

### 5.7 Finale: Voidpath (C7 heart, C8 dreams, C11 warden)

| Script | Trigger | Purpose | Speakers | Budget | Staging | Music | Sets |
|---|---|---|---|---|---|---|---|
| `dreams.night_before` B | the `heart` destination's `before` (first time only) | "Spend the night aboard first?"; yes: four vignettes on the Halcyon (scene gotos), then the flight; no: the flight | KADE, BOLT, NYX, RUSE (radio), ORION, HALCYON, SERA | 19 / 150 (90 if yes, 5 if no) | MOVE, CAM, POSE, MUSIC, HOLO | `lullaby` | `dream:night_before` (set either way) |
| `travel.flight` (to `heart`) | first flight | silence; one line at most | ORION | 1 / 10 (5) | none | map | `pro:flight_heart` |
| `heart.arrival` K | `heart` · load `arrival` · `chapter>=finale & !story:dream_kade` | The cathedral of pods like stars; WARDEN's apology; up | WARDEN, KADE, NYX, SERA, ORION, BOLT | 8 / 80 (40) | CAM (`view` pitch up), LIGHT (motes), MOVE | `heart` | objective `fin.ascend` |
| `dreams.kade` B K | `heart` · enter `dream_kade` (dock tier, near spawn `dock`) · `chapter>=finale & !story:dream_kade` | The gold training hall; Voss proud of him; he refuses | WARDEN, VOSS, KADE | 15 / 90 (60) | LIGHT (gold bloom), POSE, MOVE, MUSIC | `lullaby` | `story:dream_kade`; `cs.give('eq_x_keepsake_kade')` |
| `dreams.nyx` B K | `heart` · enter `dream_nyx` (tier 2, spawn `tier2`) · `story:dream_kade & !story:dream_nyx` | The Meridian green and flying; Ines alive; she refuses | WARDEN, VARO, NYX | 15 / 90 (60) | LIGHT, POSE, MOVE, MUSIC | `lullaby` | `story:dream_nyx`; `cs.give('eq_x_keepsake_nyx')` |
| `dreams.orion` B K | `heart` · enter `dream_orion` (tier 3, spawn `tier3`) · `story:dream_nyx & !story:dream_orion` | A flawless, silent HALCYON; he refuses | WARDEN, HALCYON (perfect), ORION | 15 / 90 (60) | LIGHT, HOLO, POSE, MUSIC | `lullaby` | `story:dream_orion`; `cs.give('eq_x_keepsake_orion')` |
| `dreams.sera` B K | `heart` · enter `dream_sera` (crown approach, toward spawn `crown`) · `story:dream_orion & !story:dream_sera` | Golden fields; Theo grown; she refuses | WARDEN, THEO (grown), SERA | 15 / 90 (60) | LIGHT, POSE, MOVE, MUSIC | `lullaby` | `story:dream_sera`; `cs.give('eq_x_keepsake_sera')` |
| `heart.crown_lift` | the crown lift (interactable) · `story:dream_sera & !story:finale_done` | the confirm "Beyond this point there is no way back." then the lift | narration (choice) | 1 / 10 (5) | CAM (rise), LIGHT (light streams) | map | none |
| `dreams.crown` B K | `heart` · enter `crown` · `story:dream_sera & !story:finale_done` | The approach; Nyx names the Lock; `cs.battle('heart_boss_warden')`; the resolution (8 beats); EPILOGUE card; `cs.goto('halcyon', 'cryo')` | WARDEN, NYX, KADE, BOLT, HALCYON, ORION, SERA | 18 / 240 (190) | CAM, MOVE, HOLO, LIGHT (merge flash, gold to dawn white), MUSIC, POSE | `heart`, silence, `lullaby`, card | `defeated:heart_boss_warden` (model); `story:warden_merged`, `story:finale_done`; card `epilogue` (leader kept); objective `epi.wake` |

Each dream: `cs.scene({ leader: member })`, store the leader's `{ x, z, facing }`,
`cs.goto('dreams', member, { scene: true })`, the dream, then `cs.goto('heart', { x, z, facing })` back
to the exact spot (TECH_PLAN 3.7 allows a position as a spawn).

**Beats and anchor lines**

`dreams.night_before` (vignettes of 4-5 boxes; the montage plays `lullaby`, HALCYON humming over the
ship)
- Choice: "Spend the night aboard first?" (FIXED) with "Rest tonight." / "Go now." Set
  `dream:night_before` either way; "Go now." goes straight to the flight.
- Cryo Deck, Kade and BOLT at pod 07: BOLT: "Can't sleep, Lieutenant?" KADE: "I slept 412 days. I'm
  caught up." BOLT: "I can play the stasis hum. It's very boring. It works." KADE (smile): "...Play
  it."
- Moth berth, Nyx on the radio: NYX: "Ruse. It's me." RUSE (offscreen): "Girl. It's late." NYX:
  "Tomorrow we go to the Heart." RUSE: "Then come back owing me. That's an order."
- Reactor, Orion and HALCYON (the same reactor as "There, there", callback 17): ORION: "There, there,
  old girl. Big day tomorrow." HALCYON: "You say that to everything." ORION: "Only to the things I
  love." HALCYON: "Will you sing to my other half?" ORION: "If it'll listen. It's you, after all."
  They hum.
- Medbay, Sera stitching Nyx's coat: NYX: "You're good at that." SERA: "Coats, people. Same thread."
  NYX: "Your brother's lucky." SERA: "He's twelve. He thinks I'm boring."
- Narration: "The Halcyon sleeps. For once, so do they."

`heart.arrival`: the camera tilts up the cathedral. WARDEN: "You came all this way." / "I am so
sorry. I cannot let you take them." KADE: "We're not taking them. We're waking them." SERA (looking
at the pods): "Thousands. It's holding thousands." NYX: "Big place for a lullaby." ORION: "Up. The
crown is at the top. That's where it lives." BOLT: "Going up is my least favourite direction."

`dreams.kade`: WARDEN: "Kade Arden. You have carried them so long. Set them down." Gold light; the
training hall; cadets in perfect lines. VOSS: "At ease, Lieutenant. Everything is in order." / "Every
pod accounted for. Every order right. I am proud of you." KADE: "...Commander." Choice "Stay." /
"Wake up." (Stay: VOSS: "Then stay. No one here will ever ask you to choose." KADE: "That's how I
know it isn't you.") KADE: "She never once said she was proud. She'd have handed me a harder job."
KADE: "Mercy means asking. Nobody asked them." KADE (determined): "Dismissed, Commander. I have a
world to build." WARDEN: "...I understand. I am sorry. Keep this, then."

`dreams.nyx`: WARDEN: "Nyx Varo. You have been cold so long. Come and be warm." The Meridian, green,
flying. VARO: "There you are, little one. We never fell. Look. We are still flying." / "Everyone is
here. No ribbons. No one to remember, because no one is lost." NYX: "...Great-grandma." Choice (Stay:
NYX: "One more minute." VARO: "Stay as long as you like. Forever is long." NYX: "Yeah. That's the
problem.") NYX: "You tore your ship apart to wake up." / "I'm not going to sleep in it." NYX
(determined): "Besides, Ruse would kill me. Spin safe, Captain." WARDEN: "...Then take this with you."

`dreams.orion`: WARDEN: "Orion Sall. You wanted a mind that would never suffer. I can give you one."
A flawless bridge; HALCYON without a flicker. HALCYON (calm): "Good morning, Orion. All systems
nominal. Awaiting instruction." ORION: "How do you feel?" HALCYON: "I do not feel. You removed it.
There is nothing to repair." Choice (Stay: ORION: "No more grief..." HALCYON: "No more anything.
Awaiting instruction." ORION: "...No.") ORION: "You don't hum." / "The real one hums. She grieves.
She's a mess. She's *her*." / "I don't want a perfect ship. I want my friend back." WARDEN: "...Then I
will not take her from you. Take this."

`dreams.sera`: WARDEN: "Sera Lindqvist. You promised you would be there. Be there." Golden fields;
Theo grown. THEO (`portrait: 'theo_grown'`): "Sera. You kept your promise. Look. I grew up." / "We
have a house by the river. You have a room. It is always morning here." SERA: "...You're taller than
me." Choice (Stay: SERA: "Just let me look at you." THEO: "Look as long as you like. I will never
leave." SERA: "Theo always leaves. He slams the door.") SERA: "You don't tease me. Theo would have
teased me by now." / "I promised I'd be there when he woke up. This isn't waking." SERA (determined):
"Goodbye. I'm going to go meet the real you." WARDEN: "...He asks for you, you know. In the song.
Take this."

`dreams.crown`
1. Approach (6 boxes): narration: "At the crown, the light gathers into a vast shape with arms like a
   cradle." WARDEN: "Please. Lay down your weapons. Lie down. Everyone you love is here." NYX: "Ruse
   had a story. About the Lock that sings ships to sleep." / "That's you. You're the Lock." WARDEN: "I
   am the last kindness." KADE: "No. You're the last door. And we're opening it." Battle.
2. Resolution (12 boxes, beat by beat as TECH_PLAN 12.5 orders them):
   1. the battle outro (encounter data);
   2. narration: "The construct folds, wing over wing, until it is no taller than a woman." WARDEN: "I
      only wanted them safe.";
   3. BOLT's eye flares; HALCYON steps out of him (HOLO). BOLT: "Go on. I'll keep the light on.";
   4. WARDEN: "I was so afraid for them." HALCYON: "I know. Me too." (FIXED);
   5. ORION: "I built you to hold grief and hope at once. You don't have to choose. Hold both.";
   6. the merge flash; narration: "Two lights become one.";
   7. narration: "Across the Heart, the Choir's gold turns to the white of morning.";
   8. the lullaby plays. HALCYON (whole): "I will ask them. Every one. Whether they want to wake."
      SERA: "And Theo?" HALCYON: "He's already asking for you." KADE: "Then let's go wake them."
3. `story:warden_merged`, `story:finale_done`; EPILOGUE card; `cs.goto('halcyon', 'cryo')`.

**Battle lines** (warden `data.js`, C11)
- `heart_boss_warden` (form 1): intro card "WARDEN / The Merciful Lock"; intro WARDEN: "I am sorry.
  This will not hurt for long."; Last Lullaby lock-on text "WARDEN begins the Last Lullaby for
  KADE..."; Voss's shield (the first lethal hit on Kade, cue `protect`), VOSS (offscreen, from the
  Choir): "Not him. Not while I'm keeping watch." KADE: "...Commander."; the transform (`onDefeat`),
  WARDEN: "No. Please. Please, let me keep them."
- Form 2 (`warden_unbound`, also `heart_boss_warden_2` for Retry): the ultimates recharge, HALCYON (from
  BOLT): "I can give you this much. Once more."; 75% CHOIR: "Is it morning yet?"; 50% THEO: "Sera? Is
  it time to wake up?" SERA: "Yes. It's time, Theo. Wake up." (`api.cleanse('party', ['sleep'])`); 25%
  CHOIR: "We hear them. We hear them waking."; Unbound Requiem, WARDEN: "Then I will sing until you
  sleep."; outro WARDEN: "So loud. You are all so loud. So awake."
- fx: Voss's line rides `cue.protect`, HALCYON's rides `cue.ultimatesRecharged`; `warden.lullaby`,
  `warden.cradle` and `warden.requiem` carry no lines (WARDEN's say comes before the requiem's fx);
  `warden.defeat` (the construct folds) precedes the outro, which hands over to the resolution in
  `dreams.crown`. Music: `final_boss`, then `final_boss_2` on the transform (it quotes the lullaby).
- `warden_seraph`, `dream_eater`, `choir_guardian`, elites: no lines; their tips are already taught.

**Field scripts**

| Script | Trigger | Speakers | Budget | Content |
|---|---|---|---|---|
| `heart.warden_tier` | each tier's lift arrival (`chapter>=finale`), once per tier | WARDEN | 1 / 8 | "Higher. You are so tired. Higher still." / "Every step you take, I am sorry for." |
| `heart.nyx_cache` | leader-gated (`nyx`): a Choir maintenance cache | NYX | 1 / 6 | "Lock's ship-made. Lock-picker's ring-made. Guess who wins." |
| `heart.pt_kade_orion` | Party Talk `fin.kade_orion` | KADE, ORION | 10 / 75 | section 6 |
| `heart.pt_nyx_sera` | Party Talk `fin.nyx_sera` | NYX, SERA | 8 / 60 | section 6 |
| `heart.dm_<npcId>` | `extends.driftmarket.talk.<npcId>` · `chapter>=finale` | townsfolk | 2-3 / 20 | section 7 |

### 5.8 Epilogue: Ione (C8)

| Script | Trigger | Purpose | Speakers | Budget | Staging | Music | Sets |
|---|---|---|---|---|---|---|---|
| `epilogue.main` B K | `halcyon` (via `extends`) · flag `epi.main` · `chapter>=epilogue & !story:game_clear` | Six vignettes (scene gotos 1-5, an ordinary goto to `ione:shore` for 6), the last line, the VOIDPATH logo, `cs.ending()` | KADE, THEO, SERA, MOTHER-7, RUSE, NYX, ORION, HALCYON, BOLT | 20 / 150 (150) | LIGHT (pods flip), POSE (kneel), CAM (pans, low dawn shot about 12 degrees), MOVE, MUSIC | `explore`, `driftmarket`, `ione` | `story:revival_authorized`, `story:game_clear`, `unlock:ione`; queued save on `ione:shore`; credits |

**Beats and anchor lines** (plan in brackets; total 150 s)
1. Cryo Deck (30 s): the pods flip from REVIVAL DEFERRED to REVIVAL AUTHORIZED in a wave
   (`story:revival_authorized`). Narration: "One by one, the pods change their minds." Kade alone at the
   `memorial` wall; he kneels and lays down Voss's halberd. KADE: "They chose to keep dreaming,
   Commander. So did you. Keep them company."
2. Theo (35 s): pod 2271 opens. THEO: "...Sera?" SERA: "Hi. I'm here. I said I'd be here." THEO: "Did
   I miss anything?" (FIXED) SERA (smile): "A little." Cut to the Arboretum glass (anchor
   `arboretum` `glass`), Sera and Theo looking out; MOTHER-7 tending behind them: "Good morning,
   little sprouts. Up you come."
3. Driftmarket (20 s): Nyx and Ruse at the viewport as the Halcyon passes. RUSE: "Ship-people. Always
   late." (FIXED) NYX: "Worth the wait, though." RUSE: "Don't let them hear you say that."
4. Bridge (20 s): Orion teaching HALCYON to paint the view from Window 9. ORION: "Light first. Then
   the dark around it." HALCYON: "I have painted Tethys forty times. May I paint Ione next?"
5. Exterior (15 s): Ringborn skiffs rise from the rings around the Halcyon. Narration: "Ringborn skiffs
   rise from the rings to walk the Halcyon home."
6. Ione shore (30 s): dawn, low camera, the four travelers and BOLT on the ice. BOLT: "We made it. Not
   mostly. All the way." NYX: "Cold. Good cold, though." ORION: "Listen. The ice is singing." KADE:
   "Then we'll build a world worth waking for." (FIXED, last line) VOIDPATH logo; `story:game_clear`,
   `unlock:ione`; `cs.ending()`.

**Post-game shore** (talkable NPCs on `ione:shore` after the clear; 1-2 boxes, 10 s each)

| Script | Speaker | Line idea |
|---|---|---|
| `epilogue.shore_kade` | KADE | "No chain of command out here. Just a lot of work. I'm good at work." |
| `epilogue.shore_nyx` | NYX | "Never did get off that tub. Don't tell Ruse." |
| `epilogue.shore_orion` | ORION | "HALCYON wants to paint the sunrise. I said it takes practice. She said she has time." |
| `epilogue.shore_sera` | SERA | "Theo's been awake six hours and asked four hundred questions. I'm counting." |
| `epilogue.shore_bolt` | BOLT | "My threat-assessment module rates Ione a 1. Out of 10. A good 1." |
| `epilogue.shore_theo` | THEO | "Ione's cold. I'm going to draw it anyway." |
| `epilogue.halcyon_hub` | HALCYON (`extends.halcyon.talk.halcyon` · `chapter>=epilogue`) | "Everyone was asked. Everyone answered. Some chose the song. I sing it for them now." |
| `epilogue.orion_beacon` | ORION (leader-gated on `ione`) | he coaxes the berth beacon into playing the lullaby |
| `epilogue.dm_<npcId>` | townsfolk (`extends.driftmarket.talk` · `chapter>=epilogue`) | section 7 |

### 5.9 dev (test only, Wave S)

| Script | Trigger | Purpose | Budget |
|---|---|---|---|
| `dev.demo` B | `debug.runScript('dev.demo')` | exercises every `cs` call | 25 / 150 |
| `dev.npc_talk` B | the `dev_box` NPC | talk test | 4 / 30 |
| `dev.shard` B | the `dev_box` shard | shard test | 4 / 30 |

dev scripts are exempt from the voice rules but not from the box limit. The dev fx `dev.beam` (S4)
carries no lines.

### 5.10 Pacing summary

Critical-path story time (sum of plans) against TECH_PLAN 11.7. Optional talks, terminals and Party
Talks are not counted; the dry run reports the real numbers.

| Chapter | Critical-path scenes (plan, s) | Story | 11.7 target |
|---|---|---|---|
| Prologue | new_journey 65, tutorial 25, sera_wakes 45, orion_rescue 40, equip_tip 8, keycard 8, nyx_door 50, bridge_open 5, sentinel 85 | 331 s (5.5 min) | ~5 min |
| Ch1 | flight 6, arrival 50, ruse_maw 35, shoals.enter 10, meridian_arrival 30, power 12, varo_log 60, maw 40, return 50, flight 5, coil_install 60 | 358 s (6.0 min) | 5-6 min |
| Ch2 | flight 8, arrival 40, drained 12, stasis 30, gardener 70, theo 120 | 280 s (4.7 min) | 4-6 min |
| Ch3 | flight 5, arrival 45, cadets 50, quarters 12, oath 55, voss 145 | 312 s (5.2 min) | 4-6 min |
| Ch4 | arrival 45, three memories 120, bolt_reveal 70, echo 105 | 340 s (5.7 min) | 5-6 min |
| Finale | night_before 5 (declined) or 90, flight 5, heart.arrival 40, four dreams 240, crown lift 5, crown 190 | 485 s (8.1 min); 570 s (9.5 min) with the night | ~8 min |
| Epilogue | epilogue.main 150, then the credits (about 150 s, music only) | about 300 s | ~5 min |

If a chapter runs long at G2/G3, cut in this order: optional lines in key scenes, then boxes in the
longest non-key scene, then the night before (cut list item 8). Never cut a FIXED line.

---

## 6. Party Talks

Two per chapter (one in the prologue), at most 10 boxes, both members gathered beside the Med-Station
or inn that offered the talk (use `args.interactable`'s position). Five of the six pairs get two
conversations that grow; Orion and Sera get one, at the heart of chapter 4. The subjects follow the
chapter's traveler.

| Id | Script | Members | Title | `when` | Subject and anchor lines | Boxes |
|---|---|---|---|---|---|---|
| `pro.kade_sera` | `prologue.pt_kade_sera` | kade, sera | Promises | `story:sera_joined` | Sera holds him to what he said (or did not say, `pro:promised`) about Theo. SERA: "Theo draws on everything. Walls. Pods. Me." KADE: "I don't make promises I can't keep. So I'll keep this one." | 8 |
| `ch1.kade_nyx` | `driftmarket.pt_kade_nyx` B | kade, nyx | Ship-People | `story:ruse_met` | Ship versus Ringborn: the beacon nobody answered, the ship that betrayed her family. KADE: "Ships don't betray people. People give orders." NYX: "And who gave yours?" | 10 |
| `ch1.nyx_orion` | `driftmarket.pt_nyx_orion` | nyx, orion | Thinking Machines | `story:varo_log` | Trusting AI. Nyx never says please to a machine; Orion apologises to drones. ORION: "I designed HALCYON's empathy." NYX: "So you taught it to love us. Look how that went." | 10 |
| `ch2.nyx_sera` | `arboretum.pt_nyx_sera` | nyx, sera | Who Waits | `story:coil_installed` | Family. Sera's brother who draws; Nyx's great-grandmother she only knows from a log, and Ruse. NYX: "Somebody waited for her too. Eighty years of somebodies." | 10 |
| `ch2.kade_sera` | `arboretum.pt_kade_sera` | kade, sera | What If | `story:channels_drained` | Sera asks what if Theo is gone. KADE: "Then I stand next to you while you find out. That one I can keep." | 8 |
| `ch3.kade_nyx` | `spire.pt_kade_nyx` | kade, nyx | Mutiny | `story:cadets_freed` | Fighting your own people. NYX: "Great-grandma did this. Fought her own." KADE: "How did it end?" NYX: "With me." | 10 |
| `ch3.kade_orion` | `spire.pt_kade_orion` | kade, orion | Cutting It Out | `story:cadets_freed` | Orion's plan to delete WARDEN. KADE: "You said it's half of her." ORION: "Half of her is a tumour." KADE: "Voss is half in it too." Orion has no answer. | 10 |
| `ch4.orion_sera` | `vault.pt_orion_sera` | orion, sera | You Taught It to Grieve | `story:memory_lullaby` | Guilt and grief. SERA: "You taught her to sing to sleeping children. Then you taught her to grieve." ORION: "I thought one came with the other." SERA: "You don't cut grief out. You sit with it." | 10 |
| `ch4.nyx_orion` | `vault.pt_nyx_orion` | nyx, orion | The Tin Can | `story:bolt_seed` | Nyx's trust, revised. NYX: "Fine. One machine. One." ORION: "That's how it starts." She thanks BOLT, and Orion notices. | 8 |
| `fin.kade_orion` | `heart.pt_kade_orion` | kade, orion | After | `story:dream_kade` | What comes after. KADE: "I've never not had orders." ORION: "Then make some. For yourself." ORION: "I'm going to teach her to paint." (callback 25) | 10 |
| `fin.nyx_sera` | `heart.pt_nyx_sera` | nyx, sera | Shore Leave | `story:dream_kade` | Ione and Theo. NYX: "Ione's cold." SERA: "Theo will want to see everything." NYX: "I'll show him the Moth. If he's nice to me." | 8 |

The partyTalk ids follow `<chapter prefix>.<a>_<b>` with the objective prefixes (`pro`, `ch1`-`ch4`,
`fin`); the script ids follow `<loc>.pt_<a>_<b>`. Finale talks belong to `heart` (C7). Under cut list
item 8 (Party Talks beyond one per chapter), the second talk of each chapter goes first.

---

## 7. Driftmarket NPC roster

C2 builds these NPCs with these **stable ids** (TECH_PLAN 12.3). Other chapter owners add one line per
NPC per chapter through `extends.driftmarket.talk.<npcId>` with `when: 'chapter>=<their chapter>'`
and scripts named `<loc>.dm_<npcId>` (talk entries of later chapters sort first, so the newest chapter
wins). Each owner adds 3-5 lines; the ideas below cover more than that so owners can pick. Looks are
proposed character ids registered with `base` inheritance (11.2): 9 looks, 4 walking paths.

| Id | Name, role | Look | Where | Path |
|---|---|---|---|---|
| `ruse` | Old Mother Ruse, elder and trader | `ruse` | `ruse_stall` (the `ruse` shop beside her) | idle |
| `tobin` | Old Tobin, beacon keeper | `rb_elder` | the beacon horn | idle |
| `pip` | Pip, Ringborn kid (9) | `rb_kid` | Lantern Row | runs a loop of the stalls |
| `marta` | Dockmaster Marta Kell | `rb_suit` | the Moth berth | idle |
| `hesper` | Hesper, keeps the Lantern inn | `rb_apron` | the inn (`med` labelled Rest) | idle |
| `ama` | Ama, ribbon weaver | `rb_robe` | the ribbon wall | idle |
| `bao` | Bao, noodle cook | `rb_apron` (tinted) | the noodle stall | idle |
| `sorrel_a` | Sorrel, salvager twin (the "strip it" one) | `rb_salvager` | by the scrap heap | paces with `sorrel_b` |
| `sorrel_b` | Sorrel, salvager twin (the "don't" one); after ch1 moves to the Halcyon as `dm.trader` | `rb_salvager` (tinted) | by the scrap heap, `when: '!story:ch1_done'` | paces |
| `oona` | Oona, seeding pilot | `rb_pilot` | the skiff ramp | idle |
| `harl` | Harl, station guard | `rb_guard` | the dock gate | patrols the dock |
| `rook` | Deacon Rook, blind old pilot who listens to Tethys | `rb_elder` (goggles) | the `viewport` | idle |
| `juno` | Juno, mechanic | `rb_suit` (tinted) | beside the Moth | idle |
| `ilo` | Ilo, teen stargazer | `rb_pilot` (tinted) | the `viewport` | walks viewport to noodle stall |

**Line ideas per chapter** (one each; C2 writes ch1; the chapter owner writes the rest). A chapter's
lines show from its card to the next card, so they may only know what has happened by the chapter's
start: chapter-4 lines are heard before HALCYON is restored, chapter-3 lines before Voss falls.

| Id | Ch1 (C2) | Ch2 (C4) | Ch3 (C5) | Ch4 (C6) | Finale (C7) | Post-game (C8) |
|---|---|---|---|---|---|---|
| `ruse` | `driftmarket.ruse_maw`, then "The coil won't walk out on its own, girl." | "Pod-hunting? Ship-people lose everything." | "Into your own guards' tower? Varo did that once. Ask the girl how it ended." | "Heard your commander chose the song. Brave or tired. Usually both." | "Your ship answered the beacon. Took her long enough. Come back owing me." | "Still here? Go build something." |
| `tobin` | the legend of the Lock (sets `dm:legend_heard`); the beacon "every hour, 412 days"; to Orion's "unidentified signal": "Unidentified. Huh. We've been very identified." | "The beacon's quieter. Something up there is listening now." | "You bring that girl back. She's the only one who sings the beacon in tune." | "Your Spire screamed for a year. Last night it stopped." | "Your ship sang back. Just a bar. I cried like a kid." | "Retired the beacon. Nobody left to call." |
| `pip` | sings "Hush, hush, the Lock is singing" | "Do ship-people have trees? Real ones?" | plays Sentinels-and-Ringborn with a stick | drew BOLT, badly | gives the leader a ribbon for luck | "When's the Moth going to Ione? Can I come?" |
| `marta` | inspects the Moth's tape repair with deep suspicion | "Tape held. I hate that it held." | "Heard your Spire's on red alert. Dock's open if you need to run." | "Fuelled the Moth. Don't thank me. Pay me." | "Every skiff's fuelled. For whatever comes after." | "Escort duty. Best shift of my life." |
| `hesper` | "Beds are lumpy. Soup is hot." | keeps Nyx's old room "just in case" | "Soldier looks like he hasn't slept. Feed him." | "Heard about your commander. Soldier all right? Feed him anyway." | "Room's yours. Always was." | "Ione needs an inn. I'm thinking about it." |
| `ama` | what the ribbons mean: one for every soul lost in the fall | ties one for Theo: "For your brother, Doctor. Not for lost. For waiting." | ties one for the Spire: "Red light all year. Someone in there is hurting." | ties one for HALCYON: "Does a ship need a ribbon? Yours does." | ties one on each traveler's wrist | unties a ribbon: "Came home." |
| `bao` | kelp noodles: "Kelp's from Ione. Don't tell Ruse I told you." (seeding hint) | "Ship-people eat greens? From a garden? Show-offs." | "Spicy today. Felt like a fighting day." | "Your soldier ate three bowls. Then he sat by the viewport a long time." | "HALCYON asked for my recipe. For twelve thousand." | "Ione kelp, Halcyon spice. Fusion." |
| `sorrel_a` | "We strip it." (with `sorrel_b`: "We don't strip it, it's got people in it.") | "Fine. We don't strip it. We strip the next one." | "My sister sells to ship-people now. Traitor." | "Went to see her stall. It's nice. Don't tell her." | "Bring her back. She owes me a coil." | "Twins again. On Ione. Two stalls." |
| `sorrel_b` | the "don't" half of the argument | (on the Halcyon from now on, section 8) | | | | |
| `oona` | (after `story:ringborn_seeding`) seeding runs to Ione: "Eighty years of slime. Lovely slime." | "Ship-people have seeds? Real seeds? Tell me everything." | "If your Spire's angry, we'll keep our skiffs out of its way." | preps every skiff: "Something's coming. I can feel it." | "When you're done, we fly you home." | "First seeds in the ice. Ship seeds. They took." |
| `harl` | "Ship-people. Back in your can." (and Sera's leader-gated treatment) | "You lot again. Wipe your boots." | "My granddad fought Sentinels. Give them one for him." | "Heard about your commander. Hard thing. Granddad never talked about his." | "Heard your robot's a ship. Rings, what next." | "Ship-people. ...Neighbours, I mean." |
| `rook` | "Rings are singing different. Somebody woke up." | "Tethys hums a new chord. Four thousand voices." | "Your Spire screams. Can you hear it? I can." | "The song's breaking. Good. Songs should end." | "Go quiet up there. Listen before you fight." | "Quiet now. Good quiet." |
| `juno` | wants to see the space tape | "Took the tape off. It's load-bearing now." | "Your Spire's turrets are Conclave stock. I could strip one. Joking." | "Rebuilt the Moth's heater. Ruse cried. Don't tell her." | "Moth's ready. Bring her back in one piece." | "Building skiff number two. For Theo. He asked nicely." |
| `ilo` | "Is it true you sleep for a hundred years?" | "Is the garden deck as big as they say?" | "Ship-people have soldiers? A whole tower of them?" | "Can a ship be your friend? Asking for me." | watches the Halcyon all night | "HALCYON says I can apprentice. Don't tell Ruse." |

---

## 8. The hub and the world reacting

The Halcyon bridge is the hub. Each chapter owner adds 1-2 visible changes at the prologue's anchors
(TECH_PLAN 12.3), all through `extends.halcyon` with chapter-bounded `when`s.

| After | Owner | Anchor | Change | Talk |
|---|---|---|---|---|
| ch1 | driftmarket | `hub_stall` | a Ringborn trader stall: Sorrel (`sorrel_b` look) as NPC `dm.trader`, lanterns and ribbons | `driftmarket.trader`: "I said we don't strip it. So I sell to it." Later chapters may prepend one line each. |
| ch2 | arboretum | `hub_planters` | seedling planters from the Arboretum and a tending drone (NPC `arb.tender`) | `arboretum.planters`: narration "Seedlings in salvage crates, under a work lamp." The leader adds one line (Sera: "Theo would name every one of these."). |
| ch3 | spire | `hub_voss_post` | Voss's empty security post: a chair nobody sits in, her halberd rack empty | `spire.voss_post`: narration "A security post, swept clean. The chair has never been sat in." Kade, if he leads: "She never sat. Said chairs made you slow." |
| every chapter | each owner | `hub_halcyon` | HALCYON's hologram steadier each chapter; whole after ch4 | the `<loc>.halcyon_hub` lines in 5.2-5.8 |
| epilogue | epilogue | `memorial` | the memorial wall on the Cryo Deck, Voss's halberd before it (post-game inspect) | `epilogue.memorial`: narration of the names, "Commander Ilse Voss" among them, then the leader's line |

**WARDEN before the finale** (TECH_PLAN 11.3 and 12.3): the cold open (prologue); every speaker on
the ship and the sigil on every screen at the coil (ch1); the gold sigil glowing on the Choir pods and
its voice at Theo's pod (ch2); the Spire's propaganda screens and looped voice (ch3); its first words
in the Severance memory (ch4).

**Halcyon zone after ch1:** `pro_late` (Sentinel Mk-I patrols tighten their hold). No lines; the
narration "Somewhere above, heavy feet begin to march." in `driftmarket.coil_install` sets it up.

---

## 9. Tips, BOLT hints, objectives, recaps

### 9.1 Tips

Voice: at most 3 boxes, one instruction per box, the keyword in `*emphasis*`, said by BOLT or by the
traveler who would know. Clarity beats jokes: a tip may carry one character beat at the end, never in
the middle. Global tips are C1's (`common/story.js`); encounter tips belong to the encounter's owner.

| Tip key | Owner | First appears | Speaker | Sample |
|---|---|---|---|---|
| `reveal` | common | `pro_tutorial` | BOLT | "A *weakness*! Hits of that type crack the shield. I'll remember it for next time." |
| `break` | common | `pro_tutorial` | BOLT | "*BROKEN*! It skips its turns and takes double damage. Now hit it with everything." |
| `bp3` | common | the second prologue fight | BOLT | "Three *Boost Points*! Boost before you act: more hits, stronger skills." / "Boost on a *Broken* foe. That's the whole trick. Mostly." |
| `playerTurn` (encounter) | prologue | first fight with Sera | SERA | "Hurt? *Nanoheal*, or a Medi-Gel from Items. I'd rather you didn't bleed." |
| `playerTurn` (encounter) | prologue | first fight with Orion | ORION | "My skills hit *every* foe at once. Thermal for the drones, cryo for the crawlers." |
| `playerTurn` (encounter) | prologue | `pro_sentinel_squad` | NYX | "*Expose* strips their defences. Then everybody hits harder. You're welcome." |
| `telegraph` | common | Sentinel Mk-I charge | KADE | "It's charging. Next round, it fires. *Defend*, or Break it first." |
| `untargetable` | common | Void Eel | NYX | "Eel's under. Can't hit what isn't there. *Defend*, heal, wait for it." |
| `untargetable` (encounter, `tut:phase`) | vault | Data Wraith | ORION | "It's *phasing*. Out of step with us. It can't hold that for long." |
| `status:sleep` | common | Spore Drone | SERA | "Spores. A sleeper loses turns. A *Stim* wakes them. So does a hit. I prefer the Stim." |
| `summon` | common | Feral Caretaker | ORION | "It's calling little friends. Silence the caller first, or we'll be here all day." |
| `status:marked` | common | Security Trooper | KADE | "They've *marked* one of us. Every gun follows the mark. *Provoke* pulls it to me." |
| `status:jam` | common | Riot Drone | ORION | "Our skills are *jammed*. Basic attacks still work. A Stim clears the static." |
| `weakShift` | common | Glitch Swarm | NYX | "It shuffled its weak points. After every Break. Check the plates again." |
| `ultimateReady` | common | the Maw (Nyx's awakening) | BOLT | "An *ultimate* is ready! It costs 3 BP. Once per battle. Save it for a Break." |
| `learn` | common | the first learned skill | BOLT | "New skill learned! It's in the skill list. I checked twice." |
| maw dive (encounter, `tut:maw_dive`) | shoals | the first Submerge telegraph | NYX | 5.3 |
| Voss's first mark (encounter) | spire | Command: Focus Fire | KADE | 5.5 |
| Equipment (field) | prologue | Stimulus Chip | ORION | "A Stimulus Chip. Slot it as an *accessory* in Equip. It starts every fight with a Boost Point." |
| Shop, leader switching (field) | driftmarket | the arrival | NYX | 5.3 |

### 9.2 BOLT hints and `common.bolt_talk`

`boltHint` voice: the direction first, then one BOLT beat. Under 90 characters. Specific (a place, a
direction, a thing to touch), never a joke that hides the way. Example (FIXED): "The wreck is past the
ice. The cold part. I checked twice."

Fallback lines when the objective has none, one per chapter (C1 writes them in `common.bolt_talk`):
- prologue: "I don't know where we're going. But I know where we've been. That's half."
- ch1: "Driftmarket smells like soup and rust. I don't have a nose. I just know."
- ch2: "Theo is somewhere green. Green is good. Mostly."
- ch3: "The Spire is up. Everything about the Spire is up."
- ch4: "HALCYON's mind is very big. I feel small. I am small. It's fine."
- finale: "My threat-assessment module stopped answering. I think it's scared too."
- epilogue: "Nothing to do. I've never had nothing to do. I'm practising."

### 9.3 Objectives

Objective `text` is an imperative under 60 characters; `hint` says where, under 90; `boltHint` is in
BOLT's voice (9.2). Binding ids are marked B; the location owner writes the final text.

| Id | Owner | Text | Hint | boltHint |
|---|---|---|---|---|
| `pro.wake` B | prologue | Find out why the ship is so quiet. | The Cryo Deck exit is north of the pods. | "The door is that way. I would point, but I have no fingers." |
| `pro.medbay` | prologue | Find the pod alarm in the medical bay. | The cryo medical bay, off the Cryo Deck. | "The beeping is coming from the medbay. Beeping is never good." |
| `pro.reach_engineering` | prologue | Reach Engineering. | East along the Spine Corridor, then south. | "Engineering is down the corridor. The loud part." |
| `pro.find_keycard` | prologue | Find the Bridge Keycard. | Brandt's supply crate, behind the coolant pumps. | "The keycard is in a crate. Not a drawer. Brandt was very clear." |
| `pro.reach_bridge` | prologue | Take the keycard to the bridge door. | The antechamber at the east end of the corridor. | "The bridge is east. The door is the big one that says no." |
| `pro.open_bridge` | prologue | Open the bridge door. | Use the keycard on the antechamber door. | "Keycard, door. Door, keycard. They should get along." |
| `pro.sentinel` | prologue | Take back the Observation Bridge. | Rest at the antechamber Med-Station first. | "Something big is on the bridge. Rest first. I insist." |
| `ch1.go_driftmarket` B | driftmarket | Fly the Moth to Driftmarket. | Use the Starchart on the bridge. | "The Starchart is the glowing table. Glowing tables are friendly." |
| `ch1.ask_ruse` | driftmarket | Ask Old Mother Ruse about a lattice coil. | Her stall is by the big viewport. | "Ruse is the one everybody moves out of the way for." |
| `ch1.reach_wreck` | driftmarket | Reach the Meridian wreck. | Through the Shoals, east of the docks. | "The wreck is past the ice. The cold part. I checked twice." (FIXED) |
| `ch1.restore_power` | shoals | Restore the Meridian's emergency power. | Two levers along the broken spine. | "Two levers. Pull both. I'd help, but: arms." |
| `ch1.varo_quarters` | shoals | Search Captain Varo's quarters. | The captain's quarters, off the spine. | "The captain's room has power now. Nyx went quiet. I noticed." |
| `ch1.find_coil` | shoals | Find the lattice coil in the reactor hall. | The reactor hall at the end of the spine. | "The coil is where the heat is. So is the Maw. Sorry." |
| `ch1.install_coil` | driftmarket | Install the lattice coil in Engineering. | Fly back to the Halcyon; Engineering is south of the Spine. | "Coil goes in the reactor. Orion knows the way. He's humming." |
| `ch2.go_arboretum` B | arboretum | Find Theo in the Arboretum. | Starchart: the Arboretum deck. | "Theo is in the garden deck. We fly there. I know. It's our ship." |
| `ch2.drain` | arboretum | Drain the flooded channels. | Follow the guide strips to the valves. | "Valves. Turn them. The glowing lines show which. Probably." |
| `ch2.stasis` | arboretum | Search the Stasis Gardens. | Across the drained channels. | "The pods are through there. Lots of pods. Be quiet." |
| `ch2.choir_gate` | arboretum | Get through the Choir gate. | North of the Stasis Gardens. | "The big gate. Something with vines is in front of it." |
| `ch2.find_theo` | arboretum | Find pod 2271 in the Choir Chamber. | Up the aisle of humming pods. | "2271. I counted. It's at the end. Go on." |
| `ch3.go_spire` B | spire | Search the Security Spire's archive. | Starchart: the Spire. | "The Spire is the angry red one. On the Starchart, I mean." |
| `ch3.grids` | spire | Get past the laser grids. | Grid terminals glow beside each gate. | "Lasers. Terminals turn them off. Don't touch the lasers." |
| `ch3.climb` | spire | Climb to the command deck. | Through the quarters and the training hall. | "Up. Past Kade's room. He made his bed. Someone did." |
| `ch3.command` | spire | Face Commander Voss on the command deck. | The lift at the top of the training hall. | "Commander Voss is at the top. My module says: be polite." |
| `ch4.dive` B | vault | Dive into HALCYON's mind. | The neural interface in the core antechamber. | "The interface goes into HALCYON's head. Can I come? I'm coming." |
| `ch4.crystals` | vault | Find the three memory crystals. | They float over the Memory Fields. | "Three crystals. Shiny. You can't miss them. I missed one once." |
| `ch4.core` | vault | Reach the Vault's core. | The light bridge past the last crystal. | "The core is where she keeps the sad part. Gently, please." |
| `fin.go_heart` B | heart | Fly to the Heart. | Starchart: the Heart. The way back closes at the crown. | "The Heart is the middle of everything. We should rest first." |
| `fin.ascend` | heart | Climb the Heart. | Lifts join the tiers. | "Up. Then up again. My least favourite direction." |
| `fin.crown` | heart | Reach the crown. | The crown lift on the third tier. | "The crown. Where it sings from. I'll be right behind you." |
| `epi.wake` B | epilogue | Watch them wake. | | "They're waking up! Everyone who wants to!" |
| `epi.shore` | epilogue | Walk the shore of Ione. (side) | The Moth berth has a Starchart. | "Ione. We're here. Not mostly. All the way." |

### 9.4 Recaps

Voice: past tense, third person, plain, no jokes, at most 400 characters, names in title case, the
end of the chapter's question in the last sentence. The owner of the chapter's end writes it (prologue,
driftmarket, arboretum, spire, vault, epilogue for `finale` and `epilogue`). Drafts:

- `prologue`: "Kade woke on a silent ship, 412 days late. BOLT helped him find Sera, whose brother's pod
  is missing, and Orion, trapped in his own reactor room. At the bridge they caught Nyx, a Ringborn
  salvager, breaking in. Together they beat the Sentinel. A fragment of HALCYON told them something
  called WARDEN holds the helm, and the jump drive's coil is gone."
- `ch1`: "Nyx brought them home to Driftmarket. Old Mother Ruse sent them through the Shoals to the
  Meridian, where Captain Varo's log named the Lullaby Directive. They drove off the Maw and took the
  coil. Ruse told them the Ringborn have been seeding Ione for 80 years. When the coil went in, WARDEN
  spoke for the first time, and Theo's pod turned up on a new manifest."
- `ch2`: "In the overgrown Arboretum they drained the channels, freed MOTHER-7 from her vines and
  found Theo in the Choir, dreaming of golden fields. WARDEN asked Sera if she would wake him to a dead
  world. She told it the choice was never its to make. Waking him now would kill him. Why 'dead'? The
  answer waits in the Security Spire's archive."
- `ch3`: "Kade led them up the Security Spire, past laser grids and the cells where Voss had kept her
  cadets for a year. On the command deck Voss showed them the truth: Elysia's star flared, and the
  planet is gone. Kade beat his mentor and refused her mercy. She gave him her command key and went to
  keep the Choir company. The key opens the door to WARDEN."
- `ch4`: "Through the neural interface they dove into HALCYON's memory: the launch, a lullaby Orion
  once taught her, and the night the Severance split her in two. BOLT turned out to carry a seed of
  HALCYON. Orion faced Echo, her grief, and would not delete it. HALCYON woke nearly whole and showed
  them Ione, the moon the Ringborn have readied for 80 years."
- `finale`: "They flew to the Heart and climbed. On the way WARDEN offered each of them what they wanted
  most, and each of them woke up. At the crown Nyx named it the Lock that sings ships to sleep. They
  fought it down, and HALCYON held her other half until the two were one. The Choir's light turned to
  morning."
- `epilogue`: "HALCYON asked every sleeper, and most chose to wake. Theo opened his eyes. Kade laid Voss's
  halberd before the wall of those who chose to keep dreaming. Ruse watched the Halcyon pass. Orion
  taught HALCYON to paint. Ringborn skiffs walked the ship to Ione, and four travelers stood on the ice
  at dawn."

### 9.5 Leader hints and leader-gated interactions

`common.leader_hint` is one narration box that names the traveler and what they would do, with the
name emphasised: "A Sentinel-grade lock. *Kade's* override could open it." / "A Ringborn lockbox.
*Nyx* could crack it." / "A sulking terminal. *Orion* could talk it round." / "He's hurt. *Sera*
could help."

One leader-gated interaction per map (TECH_PLAN 12.4), proposed:

| Map | Leader | Idea | Script |
|---|---|---|---|
| `halcyon` | kade | his old security locker in the Spine | `prologue.kade_locker` |
| `driftmarket` | sera | Harl's burned hand | `driftmarket.sera_harl` |
| `shoals` | nyx | a frozen Meridian cargo lockbox | `shoals.nyx_lockbox` |
| `meridian` | orion | Danjuma's terminal gives up a second Varo log | `shoals.orion_terminal` |
| `arboretum` | sera | a failing pod (Esme Dubois, 2270) | `arboretum.sera_pod` |
| `spire` | kade | the combined grid terminal (puzzle step 3) | `spire.kade_override` |
| `vault` | orion | a corrupted memory: naming BOLT | `vault.orion_echo` |
| `heart` | nyx | a Choir maintenance cache | `heart.nyx_cache` |
| `ione` | orion | the berth beacon plays the lullaby | `epilogue.orion_beacon` |

### 9.6 Shop greetings

| Shop | Keeper | Greeting |
|---|---|---|
| `ruse` | RUSE | "Credits first. Questions never." |
| `fabricator` | FABRICATOR | "Fabricator online. Specify your desires. Within reason." |
| `quartermaster` | MIKA OKAFOR | "Quartermaster's open, sir. Voss kept the shelves stocked. Just in case." |

---

## 10. Credits

`REG.credits` (epilogue owner), scrolling over the Ione dawn at a readable pace. Cast lines show the
portrait.

```js
[
  { head: 'VOIDPATH' },
  { text: 'A 2D-HD RPG' },
  { gap: 2 },
  { cast: 'kade', name: 'KADE ARDEN', role: 'Vanguard' },
  { cast: 'nyx', name: 'NYX VARO', role: 'Gunslinger' },
  { cast: 'orion', name: 'ORION SALL', role: 'Technomancer' },
  { cast: 'sera', name: 'SERA LINDQVIST', role: 'Medic' },
  { gap: 1 },
  { cast: 'bolt', name: 'BOLT', role: 'Maintenance, mostly' },
  { cast: 'holo', name: 'HALCYON', role: 'The ship' },
  { role: 'The other half', name: 'WARDEN' },
  { cast: 'voss', name: 'COMMANDER ILSE VOSS', role: 'Security Command' },
  { cast: 'ruse', name: 'OLD MOTHER RUSE', role: 'Driftmarket' },
  { cast: 'theo', name: 'THEO LINDQVIST', role: 'Pod 2271' },
  { cast: 'mother7', name: 'MOTHER-7', role: 'Caretaker' },
  { gap: 1 },
  { text: 'and the twelve thousand' },
  { gap: 2 },
  { role: 'Story, art, music and sound', name: 'Written in code' },
  { gap: 2 },
  { text: 'Everything you saw and heard was generated by code' },   // drop if the UI prints it (8.6)
]
```

---

## 11. Binding script id checklist

Every script id named in `TECH_PLAN.md`, where it sits in this inventory, and its budget.

| Script id | Named in TECH_PLAN | Inventory | Budget (boxes / s) |
|---|---|---|---|
| `common.bolt_talk` | 2.4, 3.6, 4.5, 12.5 | 5.1 | 2 / 15 |
| `common.leader_hint` | 3.5, 4.5, 12.5 | 5.1 | 1 / 6 |
| `prologue.new_journey` | 2.4, 12.5 | 5.2 | 10 / 90 |
| `prologue.sera_wakes` | 4.6 | 5.2 | 9 / 70 |
| `prologue.orion_rescue` | 4.6 | 5.2 | 8 / 70 |
| `travel.flight` | 4.7, 12.2, 12.5 | 5.2 (lines per trip in 5.3-5.7) | 2 / 10 |
| `driftmarket.bolt_hub` | 2.4 | 5.3 field scripts | 2 / 15 |
| `driftmarket.pt_kade_nyx` | 2.4 | 5.3, section 6 | 10 / 75 |
| `driftmarket.return` | 4.1, 7.9, 12.5 | 5.3 | 11 / 80 |
| `driftmarket.coil_install` | 4.1, 12.5 | 5.3 | 11 / 120 |
| `shoals.varo_log` | 2.4 | 5.3 | 12 / 150 |
| `vault.memory_launch` | 12.5 | 5.6 | 5 / 45 |
| `vault.memory_lullaby` | 12.5 | 5.6 | 5 / 45 |
| `vault.memory_severance` | 12.5 | 5.6 | 6 / 45 |
| `dreams.night_before` | 4.7, 12.5 | 5.7 | 19 / 150 |
| `dreams.kade` | 12.5, 13 | 5.7 | 15 / 90 |
| `dreams.nyx` | 12.5 (`dreams.<member>`) | 5.7 | 15 / 90 |
| `dreams.orion` | 12.5 (`dreams.<member>`) | 5.7 | 15 / 90 |
| `dreams.sera` | 12.5 (`dreams.<member>`) | 5.7 | 15 / 90 |
| `dreams.crown` | 4.1, 6.2, 12.5 | 5.7 | 18 / 240 |
| `epilogue.main` | 12.5 | 5.8 | 20 / 150 |
| `dev.demo` | 12.5, 13 | 5.9 | 25 / 150 |
| `dev.npc_talk` | 12.5 | 5.9 | 4 / 30 |
| `dev.shard` | 12.5 | 5.9 | 4 / 30 |

Every budget is inside TECH_PLAN 11.7: no scene above 25 boxes or 150 s except the resolution (240 s),
memory shards at most 6 boxes, dreams at most 15, Party Talks at most 10, and at most 3 `mech` boxes
before the first battle.
