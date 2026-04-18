# HS-NIL Concierge MVP Playbook

**Purpose:** Validate the viral-loop thesis by hand-brokering NIL deals for 20 high-school scholar-athletes and their parents in California over 30 days, with zero reliance on the platform to do the matching.

**Status:** Not started. Phase 1 code is shipped; this is the go-to-market bet that answers "does any of this actually work with real parents?"

**Audience:** You (the founder running it), one ops partner (optional but recommended).

**Timeline:** 30 days from kickoff. Go/no-go decision at day 30.

---

## 1. The Thesis We're Testing

Our entire HS-NIL bet rests on one assumption: **parents will amplify their scholar-athlete's first NIL deal as a scholarship-adjacent story**.

If a 3.8-GPA freshman getting a $250 deal from a local training facility prompts their mother to post on Instagram / LinkedIn / in a group chat — with organic pride, not because we asked — HS-NIL is the company. The loop compounds. One deal becomes three. Three parents telling three more parents becomes the CAC-free growth engine that makes the 8M-athlete TAM actually reachable.

If the deal closes and the parent says "thanks" and the loop dies there — we don't have a movement. We have a feature. HS-NIL stays optional and we put our energy into the AD compliance SaaS instead.

**This playbook is the cheapest way to find out which universe we're in.**

---

## 2. What "Success" and "Failure" Look Like

Write these on a sticky note before you start.

### Success = Continue to Phase 2 full launch

- At least 15 of 20 athletes complete a signed deal within 30 days.
- At least 10 of those 15 deals generate at least one organic public share (Instagram, LinkedIn, TikTok, X, or a local news mention the parent initiated).
- At least 5 parents refer another parent unprompted during the 30 days.
- Average parent NPS ≥ 50 on the post-deal survey.

### Failure = Pause HS-NIL, redirect to AD compliance

- Fewer than 10 deals complete.
- Fewer than 3 organic shares from parents.
- Zero unprompted parent-to-parent referrals.
- Qualitative feedback repeatedly cites "embarrassment," "too small to matter," or "worried about NCAA eligibility later."

### Yellow light = Iterate and re-test

- 10-14 deals complete with <5 organic shares: the product works mechanically, but the story isn't sticky. Spend 2 more weeks on the post-deal narrative tooling (share template generator, local-press kit), then re-test with 10 new parents.

---

## 3. Pre-Work (Week 0 — before you talk to any parent)

### Engineering must-haves

- [ ] Preview deployment live at a real domain (e.g. `hs-preview.gradeupnil.com`).
- [ ] Migrations applied to preview Supabase.
- [ ] `FEATURE_HS_NIL=true` in preview.
- [ ] Smoke-test checklist (Deploy Playbook §5) passes clean.
- [ ] Resend is sending real email; from-address is warm (not a brand new domain getting spam-filtered on day one).
- [ ] A waitlist signup dashboard you can eyeball every morning (can be a Supabase SQL query saved in the dashboard — doesn't need a UI).

### Ops must-haves

- [ ] A Google Sheet named "HS-NIL Concierge Tracker" with columns:
  - Athlete name, parent name, parent phone, parent email, state, school, sport, grad year, GPA, signup date, consent status, matched brand, deal amount, deal signed date, share observed (Y/N + URL), referral generated (Y/N)
- [ ] A Notion or Linear board with one card per athlete and one per brand. Stages for athletes: Sourced → Contacted → Consented → Matched → Signed → Share Observed. Stages for brands: Sourced → Pitched → Agreed → Deal Signed → Paid.
- [ ] A Calendly link for 15-min "intro + explainer" calls with parents.
- [ ] A signed, reviewed parental consent script (plain English, 1 page) you can email during the call follow-up.
- [ ] Legal review of (a) the concierge deal contract template and (b) the parental consent script, by California sports-law counsel. **Do not run the concierge without this.**

### Brand pipeline pre-built

- [ ] 10 California local businesses who have agreed in principle to do a $100-$500 deal with a GradeUp HS athlete. These are YOUR warm relationships — gyms, restaurants, local retailers, training facilities, martial arts studios, tutoring companies, car washes. Smaller is better; the deal size doesn't matter, the story does.
- [ ] Each brand has signed an MSA covering terms, deliverables (typical: 1 Instagram post + 1 story mention + 1 in-person appearance), IP, and settlement (ACH via Stripe Connect parent-custodial).
- [ ] Each brand has a target "athlete profile" (sport? gender? neighborhood? GPA threshold?) noted in the Notion board so matching isn't guesswork.

---

## 4. Sourcing the 20 Athletes (Week 1)

### Where to find them

Three channels, in priority order:

1. **High-school athletic directors in CIF sections you have a relationship with.** One warm intro from an AD produces 3-5 athlete leads. Ask specifically for scholar-athletes with a 3.5+ GPA — the "academic angle" does the pre-qualification for you.
2. **Club-sport coaches in well-off counties** (Marin, San Mateo, Orange, South Bay). Club coaches have high engagement with parents and zero institutional friction. Emphasize "we handle compliance, you don't have to."
3. **Parent-facing communities** (local newsletters, school booster clubs, faith-based athletic leagues). Post once in each, measure reply rate, don't repost.

**Do NOT** cold-DM athletes on Instagram. You're talking to parents, not kids, and Instagram outreach to minors is a legal and reputation risk.

### What to screen for

Target profile:

- **Age 14-17** (the "scholarship trajectory" parent narrative is strongest here; under 14 is too cute, 18+ defeats the parent-as-buyer angle).
- **GPA ≥ 3.5** (self-reported is fine for concierge; the brand doesn't need Tier C verification for a $250 deal).
- **Parent who already posts about their kid publicly** (Instagram followers > 300, LinkedIn poster, or active in a booster club). The viral loop requires a parent who's ALREADY a broadcaster.
- **Lives within 20 miles of one of your 10 brand partners.** Local = photos, in-person appearance, local press.
- **Family income middle-to-upper-middle.** Counterintuitive but important: families where $250 is "a nice win," not "rent." Poverty-family stories are important but more legally and emotionally delicate than a 30-day concierge can honor.

### The intake call (15 minutes, with the parent)

1. **Explain what NIL is** — 2 minutes, plain English. Don't assume they know.
2. **Explain the deal** — $100-$500, 1-2 pieces of content, legally parent-custodial.
3. **Confirm consent** — "If we find the right brand, are you comfortable signing a parental consent through our platform?" Yes/no.
4. **Confirm share intent** — "If your kid gets a deal, would you naturally tell friends and family? Post about it?" This is the tell — listen for discomfort, pride, hesitation. A parent who says "of course" with a smile is a green light. A parent who says "maybe?" is a yellow.
5. **Set expectations** — "This is a founding cohort. You'll be asked for feedback. We'll match within 2 weeks or tell you we couldn't."

If the parent's body language goes tight at any of steps 3-4, thank them and drop them from the list. You need 20 strong yeses, not 30 hesitant yeses.

---

## 5. Running the Deal (Weeks 1-4)

### Cadence

- **Daily (Mon-Fri, 15 min):** Open the tracker, note which athletes moved stage, which parents went silent, which brands are slow. Send one unblock-email per day.
- **Weekly (Friday, 60 min):** Review the board with your ops partner. Count deals signed, shares observed, referrals generated. Update the go/no-go thermometer.
- **Parent check-in (at signing):** You, personally, on the phone with the parent, celebrating. Ask them: "Are you planning to share this? Do you want us to draft something you can copy?" Let them say no; do not press.
- **Post-deal survey (7 days after signing):** 3 questions. "Would you do this again? Would you tell another parent? What did we get wrong?" NPS-style.

### Matching

You are the matching engine. For each athlete:

- Open the 10-brand board.
- Find the 2-3 brands whose "target athlete profile" matches.
- Reach out to the brand: "We have [athlete name], [GPA], [sport] at [school]. [One-sentence why they're a fit]. Interested?"
- When brand says yes: draft the deal memo (copy-paste from template), send to both sides, schedule the content delivery.

### Legal / compliance per deal

- Parental consent signed on the platform BEFORE any deal is offered. No exceptions.
- Deal terms do NOT reference the school by name, do NOT use team logos, do NOT suggest the compensation is performance-contingent. Your legal counsel has reviewed this template once — don't deviate.
- Disclosure to the California state athletic association (CIF) within 72 hours of signing. Currently a manual email to CIF compliance (use the placeholder address in `src/lib/hs-nil/disclosure-recipients.ts` after legal verifies it's real). Do NOT rely on the cron disclosure pipeline for the concierge — send manually and log.
- Payment via Stripe Connect to the parent's bank account. Athlete never receives funds directly under 18.

### What NOT to do

- Do not scale during the concierge. If 40 parents want in after your first Instagram post about the pilot, take their info and put them on the waitlist. You promised 20; keep it at 20.
- Do not build new features to answer concierge friction. If a parent asks "can I see all my athlete's deals in one place?" write it down, say "next month," and move on. The concierge is for LEARNING, not product dev.
- Do not fake-automate. If the parent asks "did a computer match my kid?" answer honestly: "No, I matched your kid personally. That's the founder's job right now."
- Do not let the brand side slow you down. If a brand is stalling, drop them. You have 10 brands in the pipeline; one slow brand is not worth 3 days of athlete-side silence.

---

## 6. Measuring the Viral Loop

The thing you're actually testing is **share-to-referral conversion.**

### What to count

- **Deal signed** (the floor — without this, nothing else matters).
- **Organic share** (parent posts about their kid's deal within 14 days of signing, without being asked). Track platform + URL.
- **Prompted share** (parent posts after we drafted copy for them). Tracked separately — this is NOT the real viral loop; it's us pushing.
- **Referral** (parent introduces another parent to the program, unprompted, within 30 days). This is the gold signal. Track source.
- **Secondary share** (someone in the parent's network comments/reshares). These are leading indicators of loop depth.

### How to collect

- Check each parent's public Instagram + LinkedIn every 3 days. Log anything.
- Set a Google Alert for the athlete's name + "GradeUp" + "NIL". Local-press mentions are gold.
- Ask parents in the weekly check-in: "Have you had anyone ask about this?" Their answer is a leading signal.

### Green signals to watch for

- A parent texts you, unsolicited, with a photo of their kid's brand visit.
- A parent introduces you to a friend-of-a-friend in a different sport.
- A local newspaper reaches out because they saw the parent's post.
- A brand says "we'd like to do another one."

### Red signals

- Parent ghosts for 10+ days after signing.
- Parent asks for payment to their OWN bank account (legally you can't; culturally it's a values mismatch).
- Brand asks to see the athlete's grades directly (parent consent was supposed to cover this — relitigate the MSA).
- Any compliance flag from CIF or a school AD.

---

## 7. Day 30 Decision

Sit down with your tracker and run the math:

- Deals signed: ____ / 20
- Organic shares: ____
- Referrals generated: ____
- Parent NPS average: ____
- Red-flag incidents: ____

Map to Section 2 criteria. Pick one of three paths:

### If GREEN (success criteria met):

- Ship Phase 2: real onboarding pages, Tier B transcript verification, compliance pipeline automation, brand self-serve onboarding.
- Open the CA waitlist for self-serve signup (still concierge-supported, just not exclusively sourced).
- Begin concierge in Florida.
- Announce publicly. Target is 200 signed deals in Q2.

### If YELLOW (mechanical success, narrative weak):

- Don't scale yet. Spend 2 weeks building a share-template generator + local-press outreach kit.
- Re-run the concierge with 10 new parents using the improved narrative tooling.
- Re-measure shares and referrals.

### If RED (thesis didn't fire):

- Do a 30-minute post-mortem with the 20 parents. Be honest.
- Pause HS-NIL product development. Keep the code, kill the go-to-market.
- Redirect to AD compliance SaaS (original Track 1). You'll have learned what the compliance-primary buyer actually wants by doing this concierge.
- Do not delete the HS module. In 12 months, NCAA settlement effects may make HS more attractive; you'll want the foundation.

---

## 8. Anti-Patterns to Watch in Yourself

- **Sunk cost:** you built a lot of code. That does not obligate the parents to care. Let the data tell you.
- **Confirmation bias:** count neutral responses as neutrals, not as quiet yeses.
- **Premature scaling:** the minute you let brands self-serve, the concierge is over. Do not let that happen during the 30 days.
- **Over-fitting to parent #7:** one articulate enthusiast does not make a movement. Watch the median, not the max.

---

## 9. What the Code Team Does During the Concierge

Roughly nothing new. Stabilize what's shipped:

- Monitor Sentry for any HS-NIL errors.
- Fix bugs parents and athletes report during intake/signing.
- Improve the one thing that's most friction in the consent flow, based on real observation — and ONLY that.
- Do NOT start Phase 2 features until day 30.

The concierge is a product-market-fit test. Feature work during it contaminates the signal.

---

## 10. One Sentence

*"If 15 of 20 California parents complete a deal and 10 of them tell another parent unprompted within 30 days, we build HS-NIL as fast as we can. Otherwise, we build the rail."*
