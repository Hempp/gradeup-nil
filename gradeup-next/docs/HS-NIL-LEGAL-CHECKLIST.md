# HS-NIL Legal Counsel Review Checklist

Hand this document to California sports-law counsel in a single email. Counsel should be able to read it end-to-end, return a fee estimate, and begin a one-time review engagement without further back-and-forth.

You may paste everything below the next line directly into the email body.

---

## Engagement profile

- **Who we are.** GradeUp is a pre-revenue, bootstrapped platform for high-school NIL (Name, Image, Likeness) deals. We are a California-domiciled software product built around parental consent as the primary compliance primitive.
- **What we need.** A one-time review engagement covering the documents listed below. A monthly retainer is optional but not required; we expect to engage you again after concierge feedback.
- **Timeline.** Review complete before our first concierge deal is signed. Working estimate: 3–4 weeks from engagement start.
- **Budget expectation.** $3,000–$6,000 for the review scope defined below. If your quote falls outside that range, please flag which items drive the delta so we can de-scope.
- **Counsel profile.** California-licensed. Sports-law or entertainment-law specialty. Direct experience with NCAA or NIL deal structures preferred. Experience with CIF (California Interscholastic Federation) or high-school-athletic compliance is ideal.
- **Conflicts.** We do not currently work with any athletes, brands, or agencies that would create a conflict. Please flag any before we engage.

## What we have already done

You are not being asked to audit design choices. The platform is built. We need you to review the legal surfaces that touch minors and money.

- Platform built end-to-end. Per-state rules engine (`src/lib/hs-nil/state-rules.ts`), parental-consent data model with revocation (`src/lib/hs-nil/consent-provider.ts`), state-disclosure pipeline, brand escrow flow on Stripe Connect.
- Pilot states: CA, FL, GA, IL, NJ, NY, TX. California is the priority; everything else blocks later.
- Concierge first cohort targets 5 California parents in a hand-held matching loop. No self-serve deals yet.
- Not yet deployed. Zero real users. Zero real deals. This is your opportunity to redline before anyone is bound to anything.

## Review items — ranked by urgency

### Tier 1 — blocks the first concierge deal

1. **Parental consent template.** 1–2 pages, plain-language. Scaffold lives at `docs/HS-NIL-PARENTAL-CONSENT-TEMPLATE.md` (skeleton only — expect you to author or heavily rewrite). We specifically need: (a) is the CA-specific language sufficient? (b) is the consent enforceable against a 14-year-old under CA minor-contract law? (c) are the revocation clauses structured so revocation before delivery is clean and revocation after delivery does not expose the brand or the platform?
2. **Brand Master Services Agreement (MSA).** 3–5 pages. Used when a local brand runs one or more HS-NIL campaigns through us. We need: state-athletic-association disclosure obligations baked in, liability caps that are defensible at our stage, clear termination clauses, indemnity that is balanced rather than brand-favorable.
3. **Athlete terms-of-service addendum for minors.** Platform-level ToS already exists. We need a minor-specific addendum that layers on top and is co-signed by the parent.
4. **Deliverable / content agreement template.** What a typical $250 single-post deal looks like as a signed contract. Short form, parent-readable, binding.

### Tier 2 — blocks the first ten deals

5. **Dispute-resolution clause.** Our in-app dispute flow is informal (flag → review → mediation). Does that flow map cleanly to CA law, or do we need an arbitration clause, venue clause, and class-action waiver language?
6. **Refund policy for escrow.** If a brand funds the escrow and then cancels before delivery, what are the parent's rights? If the athlete partially delivers, what is a defensible proration rule?
7. **Identity verification requirements for parental consent.** What is CA law's bar for verifying a parent's identity before we treat their consent as binding for their minor? Is knowledge-based ID enough, do we need notarization, or is a driver's-license photo + selfie defensible?
8. **Data retention policy.** GDPR does not apply. CCPA and CPRA do. Are there minor-specific retention, deletion, or sale-opt-out exceptions we are missing? We currently retain deal and consent records indefinitely.

### Tier 3 — de-risk before 100 deals

9. **Multi-state operational clauses.** What changes when we operate in TX, FL, NY, NJ, IL, GA? Do we need separate consent language per state? Any state where minor-NIL triggers a licensing regime we are unaware of?
10. **Stripe Connect custodial account legal structure.** Our flow: brand funds Stripe escrow, platform releases to parent-controlled payout account on delivery. Is that legally sound as-is, or do we need a formal trust instrument, an agency agreement, or an escrow-agent license?
11. **Agent-registration compliance.** Florida DBPR is our specific concern — the FL athlete-agent statute is aggressive. Are we operating as an athlete agent under FL law, or are we a platform? Same question for CA's Athlete Agent Act.
12. **Electronic-signature enforceability.** Which CA statute governs our e-signature flow — UETA, federal E-SIGN, or both? Anything minor-specific that invalidates a click-through for a 14-year-old even when the parent co-signs?

## Questions we want answered (legal, not code)

We do not expect you to answer all of these in one pass. Please flag which you can answer in-scope and which need a follow-up engagement.

- If a parent revokes consent after a deal is signed but before delivery, what are the brand's rights? Full refund, partial refund, specific performance, or damages?
- Can a 14-year-old's parent bind them to a multi-month deliverables contract, or does minor-disaffirmance doctrine in CA limit the enforceable term?
- What is our exposure if a brand misrepresents itself on onboarding as HS-appropriate and it later turns out not to be (e.g., alcohol, gambling, adult-adjacent)? Where does our indemnification cap liability and where does it not?
- Do we need to be a licensed athlete agent in CA under the Athlete Agent Act, or does our platform model sit outside that regime? Same question under CIF rules.
- At what point does our take-rate (currently 10% of deal value) cross from "platform fee" into "brokering" that triggers a license requirement?
- What is our tax-reporting obligation to parents for annual payouts under $600? 1099-NEC, 1099-K, nothing, or state-specific?
- If a concierge deal generates negative press — athlete misbehavior during a campaign, brand backlash — what is our liability exposure and what contractual language reduces it?

## Documents we can provide

On engagement we will send you:

- Public-facing pages: `/solutions/parents`, `/solutions/brands`, `/compare`.
- `docs/HS-NIL-BRIEF.md` — public strategic brief (parental-consent architecture).
- `docs/HS-NIL-CONCIERGE-MVP-PLAYBOOK.md` — operational playbook for the pre-concierge phase.
- Migration files for the `state_nil_rules`, `parental_consents`, and `hs_deal_disclosures` tables.
- Screenshots of the consent flow (captured after migrations apply — TODO by founder).
- Optional, on request: read-only access to a preview Supabase project so you can see real consent records in context.

If you need anything not listed, ask.

## What counsel does not do

Setting expectations so the engagement stays tight.

- You do not write our code or review architecture.
- You do not sign anything on our behalf.
- You do not run concierge outreach or handle parent-facing calls.
- You may decline this engagement if you see us as too early-stage. That is fine — please tell us so we can route to a more junior practitioner for redlining and come back to you at deal 50.

## After counsel returns

For the founder. Not counsel-facing.

- Apply redlines to the parental-consent template and brand MSA template. Version-control both.
- Create `docs/HS-NIL-LEGAL-CHECKLIST-RESOLVED.md` listing every tier item with its resolution, counsel's name, and the date.
- Log remaining open questions — items counsel flagged for a later engagement — in the resolved doc under a dedicated "Deferred" heading. Revisit post-concierge.
- Do not ship the first concierge deal until every Tier 1 item is resolved in writing.
