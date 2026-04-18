-- =====================================================================================
-- GradeUp NIL - Conversations RLS Tightening (P0 security fix)
-- Version: 20260418_001
-- Description: Replace permissive WITH CHECK (TRUE) on conversations insert with
--              a rule that verifies the authenticated user is (or will be) a
--              participant on the conversation being created.
-- =====================================================================================
--
-- RATIONALE
-- ---------
-- The original policy created in 20260216_009_rls_policies.sql was:
--
--   CREATE POLICY "conversations_insert"
--     ON conversations FOR INSERT
--     WITH CHECK (TRUE);
--
-- TRUE admits ANY authenticated user to INSERT an arbitrary conversation row
-- (optionally spoofing a deal_id) and then add themselves as a participant to
-- eavesdrop on related threads. Since conversations are linked to deals and
-- can hold sensitive messaging about sponsorship negotiation, this is a P0.
--
-- The conversations table (migration 005) stores ONLY deal_id + metadata; the
-- participant relationship lives in conversation_participants (a separate
-- join table). That means we cannot check `auth.uid() = ANY(...)` on the row
-- itself — there are no participant columns on `conversations`.
--
-- INSTEAD: gate on deal ownership. A user may create a conversation only when
-- they are a party (athlete or brand) on the referenced deal, OR when no deal
-- is referenced and they are inserting an ad-hoc thread (the participants
-- policy still controls who can be added).
--
-- This mirrors the deals_select_parties / deals_insert_brand authorization
-- surface and closes the hole without breaking the existing
-- get_or_create_deal_conversation() helper which runs as the deal's party.
-- =====================================================================================

DROP POLICY IF EXISTS "conversations_insert" ON conversations;

CREATE POLICY "conversations_insert_party_or_adhoc"
  ON conversations FOR INSERT
  WITH CHECK (
    -- Case 1: deal-linked conversation — caller must be athlete or brand on the deal.
    (
      deal_id IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM deals d
        LEFT JOIN athletes a ON a.id = d.athlete_id
        LEFT JOIN brands  b ON b.id = d.brand_id
        WHERE d.id = deal_id
          AND (a.profile_id = auth.uid() OR b.profile_id = auth.uid())
      )
    )
    OR
    -- Case 2: ad-hoc (no deal) conversation — allow any authenticated user to
    -- create it. Participant policies still gate who can join / read / write.
    (deal_id IS NULL AND auth.uid() IS NOT NULL)
  );

COMMENT ON POLICY "conversations_insert_party_or_adhoc" ON conversations IS
  'P0 fix: restricts conversation creation to deal parties (athlete/brand) or authenticated users for ad-hoc threads. Replaces permissive WITH CHECK (TRUE).';
