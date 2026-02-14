# GradeUp NIL - Voiceover Script

## Video Specifications
- **Total Duration:** 30 seconds (900 frames @ 30fps)
- **Resolution:** 1920x1080
- **Audio Format:** MP3 or WAV, 44.1kHz

---

## Scene-by-Scene Script with Timing

### SCENE 1: INTRO (0:00 - 0:06)
**Duration:** 6 seconds | **Frames:** 0-180

**Visual:** Logo animates in with glow, "GradeUp" wordmark, tagline "Your GPA Is Worth Money"

```
[0:00 - 0:02] (2 sec pause - let logo animate)

[0:02 - 0:06]
"GradeUp. Where your GPA... is worth money."
```

**Voice Direction:** Confident, bold opening. Pause slightly before "is worth money" for emphasis.

---

### SCENE 2: STATS (0:06 - 0:11)
**Duration:** 5 seconds | **Frames:** 180-330

**Visual:** Stats counting up - $127,450+, 847 Athletes, 412 Deals, 68% Conversion

```
[0:06 - 0:11]
"Over one hundred twenty-seven thousand dollars paid to athletes.
Eight hundred forty-seven verified profiles.
Real numbers. Real results."
```

**Voice Direction:** Build excitement with each number. Emphasize "Real numbers. Real results."

---

### SCENE 3: FEATURES (0:11 - 0:19)
**Duration:** 8 seconds | **Frames:** 330-570

**Visual:** Features slide in - GPA Matching, Verified Profiles, Direct Payments, Analytics

```
[0:11 - 0:15]
"Match with brands based on your academic excellence.
Verified profiles. Direct payments."

[0:15 - 0:19]
"Track everything with your personal analytics dashboard.
Everything you need to turn grades into opportunities."
```

**Voice Direction:** Clear, professional. Each feature gets about 2 seconds.

---

### SCENE 4: TESTIMONIALS (0:19 - 0:25)
**Duration:** 6 seconds | **Frames:** 570-750

**Visual:** Jasmine Taylor testimonial card - Stanford Basketball, $12,400 earned

```
[0:19 - 0:25]
"Jasmine Taylor, Stanford Basketball.
After verifying her three-point-nine GPA,
she earned over twelve thousand dollars in her first semester.
Your story could be next."
```

**Voice Direction:** Warm, inspiring. Let the success story resonate.

---

### SCENE 5: CTA (0:25 - 0:30)
**Duration:** 5 seconds | **Frames:** 750-900

**Visual:** Gradient background, "Ready to Turn Your GPA Into Opportunity?", buttons, gradeup.com

```
[0:25 - 0:28]
"Ready to turn your GPA into opportunity?"

[0:28 - 0:30]
"Join GradeUp today. gradeup.com"
```

**Voice Direction:** Strong call to action. End with confidence and clarity.

---

## Full Script (Copy/Paste for AI Voice Generator)

```
GradeUp. Where your GPA... is worth money.

Over one hundred twenty-seven thousand dollars paid to athletes. Eight hundred forty-seven verified profiles. Real numbers. Real results.

Match with brands based on your academic excellence. Verified profiles. Direct payments. Track everything with your personal analytics dashboard. Everything you need to turn grades into opportunities.

Jasmine Taylor, Stanford Basketball. After verifying her three-point-nine GPA, she earned over twelve thousand dollars in her first semester. Your story could be next.

Ready to turn your GPA into opportunity? Join GradeUp today. gradeup.com
```

---

## Recommended AI Voice Settings

### ElevenLabs
- **Voice:** "Adam" (confident male) or "Rachel" (professional female)
- **Stability:** 0.5
- **Clarity:** 0.75
- **Style Exaggeration:** 0.3

### Play.ht
- **Voice:** "Matthew" or "Joanna"
- **Speed:** 0.95x (slightly slower for clarity)
- **Pitch:** Normal

### Google Cloud TTS
- **Voice:** en-US-Neural2-D (male) or en-US-Neural2-F (female)
- **Speaking Rate:** 0.95
- **Pitch:** 0

---

## Background Music Suggestions

For `background.mp3`, use royalty-free tracks:
- **Epidemic Sound:** Search "corporate inspiring"
- **Artlist:** Search "motivational tech"
- **YouTube Audio Library:** Free options available

**Volume:** Set to 0.15-0.20 in Remotion (15-20% of voiceover volume)

---

## File Naming

Save your files as:
```
public/audio/voiceover.mp3      # Main 30-second voiceover
public/audio/background.mp3     # Background music (optional)
public/audio/voiceover-short.mp3  # 15-second version for social
```

---

## Rendering Commands

```bash
# Preview in Remotion Studio
npx remotion studio

# Render with voiceover
npx remotion render GradeUpDemoWithVoiceover out/gradeup-demo-vo.mp4

# Render without voiceover (silent)
npx remotion render GradeUpDemo out/gradeup-demo.mp4
```
