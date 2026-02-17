-- =====================================================================================
-- GradeUp NIL - Row Level Security Policies
-- Version: 009
-- Description: Comprehensive RLS policies for all tables
-- =====================================================================================

-- =====================================================================================
-- ENABLE RLS ON ALL TABLES
-- =====================================================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE sports ENABLE ROW LEVEL SECURITY;
ALTER TABLE athletes ENABLE ROW LEVEL SECURITY;
ALTER TABLE athletic_directors ENABLE ROW LEVEL SECURITY;
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_shortlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliverables ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE athlete_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- =====================================================================================
-- PROFILES POLICIES
-- =====================================================================================

CREATE POLICY "profiles_select_own"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "profiles_insert_service"
  ON profiles FOR INSERT
  WITH CHECK (TRUE);  -- Controlled by auth trigger

-- =====================================================================================
-- REFERENCE TABLES POLICIES (Public Read)
-- =====================================================================================

CREATE POLICY "schools_public_read"
  ON schools FOR SELECT
  USING (TRUE);

CREATE POLICY "sports_public_read"
  ON sports FOR SELECT
  USING (TRUE);

-- =====================================================================================
-- ATHLETES POLICIES
-- =====================================================================================

-- Searchable athletes are publicly viewable
CREATE POLICY "athletes_public_read_searchable"
  ON athletes FOR SELECT
  USING (is_searchable = TRUE);

-- Athletes can always view their own profile
CREATE POLICY "athletes_select_own"
  ON athletes FOR SELECT
  USING (profile_id = auth.uid());

-- Directors can view athletes at their school
CREATE POLICY "athletes_directors_view_school"
  ON athletes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM athletic_directors ad
      WHERE ad.profile_id = auth.uid()
      AND ad.school_id = athletes.school_id
    )
  );

-- Athletes can update their own record
CREATE POLICY "athletes_update_own"
  ON athletes FOR UPDATE
  USING (profile_id = auth.uid());

-- Athletes can insert their own record
CREATE POLICY "athletes_insert_own"
  ON athletes FOR INSERT
  WITH CHECK (profile_id = auth.uid());

-- =====================================================================================
-- ATHLETIC DIRECTORS POLICIES
-- =====================================================================================

CREATE POLICY "directors_select_own"
  ON athletic_directors FOR SELECT
  USING (profile_id = auth.uid());

CREATE POLICY "directors_update_own"
  ON athletic_directors FOR UPDATE
  USING (profile_id = auth.uid());

CREATE POLICY "directors_insert_own"
  ON athletic_directors FOR INSERT
  WITH CHECK (profile_id = auth.uid());

-- =====================================================================================
-- BRANDS POLICIES
-- =====================================================================================

-- Brands are publicly viewable
CREATE POLICY "brands_public_read"
  ON brands FOR SELECT
  USING (TRUE);

CREATE POLICY "brands_update_own"
  ON brands FOR UPDATE
  USING (profile_id = auth.uid());

CREATE POLICY "brands_insert_own"
  ON brands FOR INSERT
  WITH CHECK (profile_id = auth.uid());

-- =====================================================================================
-- CAMPAIGNS POLICIES
-- =====================================================================================

CREATE POLICY "campaigns_select_own"
  ON campaigns FOR SELECT
  USING (
    brand_id IN (SELECT id FROM brands WHERE profile_id = auth.uid())
  );

CREATE POLICY "campaigns_insert_own"
  ON campaigns FOR INSERT
  WITH CHECK (
    brand_id IN (SELECT id FROM brands WHERE profile_id = auth.uid())
  );

CREATE POLICY "campaigns_update_own"
  ON campaigns FOR UPDATE
  USING (
    brand_id IN (SELECT id FROM brands WHERE profile_id = auth.uid())
  );

CREATE POLICY "campaigns_delete_own"
  ON campaigns FOR DELETE
  USING (
    brand_id IN (SELECT id FROM brands WHERE profile_id = auth.uid())
  );

-- =====================================================================================
-- OPPORTUNITIES POLICIES
-- =====================================================================================

-- Active opportunities are publicly viewable
CREATE POLICY "opportunities_public_read_active"
  ON opportunities FOR SELECT
  USING (status = 'active');

-- Brands can view all their opportunities
CREATE POLICY "opportunities_select_own"
  ON opportunities FOR SELECT
  USING (
    brand_id IN (SELECT id FROM brands WHERE profile_id = auth.uid())
  );

CREATE POLICY "opportunities_insert_own"
  ON opportunities FOR INSERT
  WITH CHECK (
    brand_id IN (SELECT id FROM brands WHERE profile_id = auth.uid())
  );

CREATE POLICY "opportunities_update_own"
  ON opportunities FOR UPDATE
  USING (
    brand_id IN (SELECT id FROM brands WHERE profile_id = auth.uid())
  );

-- =====================================================================================
-- BRAND SHORTLIST POLICIES
-- =====================================================================================

CREATE POLICY "shortlist_select_own"
  ON brand_shortlist FOR SELECT
  USING (
    brand_id IN (SELECT id FROM brands WHERE profile_id = auth.uid())
  );

CREATE POLICY "shortlist_insert_own"
  ON brand_shortlist FOR INSERT
  WITH CHECK (
    brand_id IN (SELECT id FROM brands WHERE profile_id = auth.uid())
  );

CREATE POLICY "shortlist_delete_own"
  ON brand_shortlist FOR DELETE
  USING (
    brand_id IN (SELECT id FROM brands WHERE profile_id = auth.uid())
  );

-- =====================================================================================
-- DEALS POLICIES
-- =====================================================================================

-- Deals viewable by parties involved
CREATE POLICY "deals_select_parties"
  ON deals FOR SELECT
  USING (
    athlete_id IN (SELECT id FROM athletes WHERE profile_id = auth.uid())
    OR brand_id IN (SELECT id FROM brands WHERE profile_id = auth.uid())
  );

-- Directors can view deals for their school's athletes
CREATE POLICY "deals_directors_view"
  ON deals FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM athletic_directors ad
      JOIN athletes a ON a.school_id = ad.school_id
      WHERE ad.profile_id = auth.uid() AND a.id = deals.athlete_id
    )
  );

-- Brands can create deals
CREATE POLICY "deals_insert_brand"
  ON deals FOR INSERT
  WITH CHECK (
    brand_id IN (SELECT id FROM brands WHERE profile_id = auth.uid())
  );

-- Parties can update deals
CREATE POLICY "deals_update_parties"
  ON deals FOR UPDATE
  USING (
    athlete_id IN (SELECT id FROM athletes WHERE profile_id = auth.uid())
    OR brand_id IN (SELECT id FROM brands WHERE profile_id = auth.uid())
  );

-- =====================================================================================
-- DEAL HISTORY POLICIES
-- =====================================================================================

CREATE POLICY "deal_history_select_parties"
  ON deal_history FOR SELECT
  USING (
    deal_id IN (
      SELECT id FROM deals
      WHERE athlete_id IN (SELECT id FROM athletes WHERE profile_id = auth.uid())
         OR brand_id IN (SELECT id FROM brands WHERE profile_id = auth.uid())
    )
  );

-- =====================================================================================
-- DELIVERABLES POLICIES
-- =====================================================================================

-- Brands can view deliverables for their deals
CREATE POLICY "deliverables_select_brand"
  ON deliverables FOR SELECT
  USING (
    deal_id IN (
      SELECT id FROM deals WHERE brand_id IN (
        SELECT id FROM brands WHERE profile_id = auth.uid()
      )
    )
  );

-- Athletes can view their own deliverables
CREATE POLICY "deliverables_select_athlete"
  ON deliverables FOR SELECT
  USING (
    athlete_id IN (SELECT id FROM athletes WHERE profile_id = auth.uid())
  );

-- Brands can create deliverables
CREATE POLICY "deliverables_insert_brand"
  ON deliverables FOR INSERT
  WITH CHECK (
    deal_id IN (
      SELECT id FROM deals WHERE brand_id IN (
        SELECT id FROM brands WHERE profile_id = auth.uid()
      )
    )
  );

-- Athletes can update their deliverables (submit content)
CREATE POLICY "deliverables_update_athlete"
  ON deliverables FOR UPDATE
  USING (
    athlete_id IN (SELECT id FROM athletes WHERE profile_id = auth.uid())
  );

-- Brands can update deliverables (approve/reject)
CREATE POLICY "deliverables_update_brand"
  ON deliverables FOR UPDATE
  USING (
    deal_id IN (
      SELECT id FROM deals WHERE brand_id IN (
        SELECT id FROM brands WHERE profile_id = auth.uid()
      )
    )
  );

-- =====================================================================================
-- MESSAGING POLICIES
-- =====================================================================================

-- Conversations viewable by participants
CREATE POLICY "conversations_select_participant"
  ON conversations FOR SELECT
  USING (
    id IN (SELECT conversation_id FROM conversation_participants WHERE user_id = auth.uid())
  );

CREATE POLICY "conversations_insert"
  ON conversations FOR INSERT
  WITH CHECK (TRUE);

CREATE POLICY "conversations_update_participant"
  ON conversations FOR UPDATE
  USING (
    id IN (SELECT conversation_id FROM conversation_participants WHERE user_id = auth.uid())
  );

-- Conversation participants
CREATE POLICY "participants_select"
  ON conversation_participants FOR SELECT
  USING (
    user_id = auth.uid() OR
    conversation_id IN (SELECT conversation_id FROM conversation_participants WHERE user_id = auth.uid())
  );

CREATE POLICY "participants_insert"
  ON conversation_participants FOR INSERT
  WITH CHECK (TRUE);

-- Messages viewable by conversation participants
CREATE POLICY "messages_select_participant"
  ON messages FOR SELECT
  USING (
    conversation_id IN (
      SELECT conversation_id FROM conversation_participants WHERE user_id = auth.uid()
    )
  );

-- Users can send messages to conversations they're part of
CREATE POLICY "messages_insert_participant"
  ON messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid() AND
    conversation_id IN (
      SELECT conversation_id FROM conversation_participants WHERE user_id = auth.uid()
    )
  );

-- Participants can update messages (mark as read)
CREATE POLICY "messages_update_participant"
  ON messages FOR UPDATE
  USING (
    conversation_id IN (
      SELECT conversation_id FROM conversation_participants WHERE user_id = auth.uid()
    )
  );

-- Message attachments
CREATE POLICY "attachments_select_participant"
  ON message_attachments FOR SELECT
  USING (
    message_id IN (
      SELECT m.id FROM messages m
      JOIN conversation_participants cp ON m.conversation_id = cp.conversation_id
      WHERE cp.user_id = auth.uid()
    )
  );

CREATE POLICY "attachments_insert_participant"
  ON message_attachments FOR INSERT
  WITH CHECK (
    message_id IN (
      SELECT m.id FROM messages m
      JOIN conversation_participants cp ON m.conversation_id = cp.conversation_id
      WHERE cp.user_id = auth.uid()
    )
  );

-- Message reactions
CREATE POLICY "reactions_select_participant"
  ON message_reactions FOR SELECT
  USING (
    message_id IN (
      SELECT m.id FROM messages m
      JOIN conversation_participants cp ON m.conversation_id = cp.conversation_id
      WHERE cp.user_id = auth.uid()
    )
  );

CREATE POLICY "reactions_insert_own"
  ON message_reactions FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "reactions_delete_own"
  ON message_reactions FOR DELETE
  USING (user_id = auth.uid());

-- =====================================================================================
-- VERIFICATION POLICIES
-- =====================================================================================

-- Athletes can view their own verification requests
CREATE POLICY "verification_requests_select_athlete"
  ON verification_requests FOR SELECT
  USING (
    athlete_id IN (SELECT id FROM athletes WHERE profile_id = auth.uid())
  );

-- Directors can view verification requests for their school
CREATE POLICY "verification_requests_select_director"
  ON verification_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM athletic_directors ad
      JOIN athletes a ON a.school_id = ad.school_id
      WHERE ad.profile_id = auth.uid() AND a.id = verification_requests.athlete_id
    )
  );

-- Athletes can create verification requests
CREATE POLICY "verification_requests_insert_athlete"
  ON verification_requests FOR INSERT
  WITH CHECK (
    athlete_id IN (SELECT id FROM athletes WHERE profile_id = auth.uid())
  );

-- Directors can update verification requests
CREATE POLICY "verification_requests_update_director"
  ON verification_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM athletic_directors ad
      JOIN athletes a ON a.school_id = ad.school_id
      WHERE ad.profile_id = auth.uid() AND a.id = verification_requests.athlete_id
    )
  );

-- Verification history
CREATE POLICY "verification_history_select"
  ON verification_history FOR SELECT
  USING (
    athlete_id IN (SELECT id FROM athletes WHERE profile_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM athletic_directors ad
      JOIN athletes a ON a.school_id = ad.school_id
      WHERE ad.profile_id = auth.uid() AND a.id = verification_history.athlete_id
    )
  );

-- Verification documents
CREATE POLICY "verification_documents_select"
  ON verification_documents FOR SELECT
  USING (
    athlete_id IN (SELECT id FROM athletes WHERE profile_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM athletic_directors ad
      JOIN athletes a ON a.school_id = ad.school_id
      WHERE ad.profile_id = auth.uid() AND a.id = verification_documents.athlete_id
    )
  );

CREATE POLICY "verification_documents_insert_athlete"
  ON verification_documents FOR INSERT
  WITH CHECK (
    athlete_id IN (SELECT id FROM athletes WHERE profile_id = auth.uid())
  );

-- =====================================================================================
-- PAYMENT POLICIES
-- =====================================================================================

-- Users can view their own payment accounts
CREATE POLICY "payment_accounts_select_own"
  ON payment_accounts FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "payment_accounts_insert_own"
  ON payment_accounts FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "payment_accounts_update_own"
  ON payment_accounts FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "payment_accounts_delete_own"
  ON payment_accounts FOR DELETE
  USING (user_id = auth.uid());

-- Athletes can view their payments
CREATE POLICY "payments_select_athlete"
  ON payments FOR SELECT
  USING (
    athlete_id IN (SELECT id FROM athletes WHERE profile_id = auth.uid())
  );

-- Brands can view payments for their deals
CREATE POLICY "payments_select_brand"
  ON payments FOR SELECT
  USING (
    deal_id IN (
      SELECT id FROM deals WHERE brand_id IN (
        SELECT id FROM brands WHERE profile_id = auth.uid()
      )
    )
  );

-- Service can create payments
CREATE POLICY "payments_insert_service"
  ON payments FOR INSERT
  WITH CHECK (TRUE);

-- Payment milestones
CREATE POLICY "payment_milestones_select"
  ON payment_milestones FOR SELECT
  USING (
    deal_id IN (
      SELECT id FROM deals
      WHERE athlete_id IN (SELECT id FROM athletes WHERE profile_id = auth.uid())
         OR brand_id IN (SELECT id FROM brands WHERE profile_id = auth.uid())
    )
  );

-- Payment disputes
CREATE POLICY "payment_disputes_select"
  ON payment_disputes FOR SELECT
  USING (raised_by = auth.uid() OR against = auth.uid());

CREATE POLICY "payment_disputes_insert"
  ON payment_disputes FOR INSERT
  WITH CHECK (raised_by = auth.uid());

-- =====================================================================================
-- ANALYTICS POLICIES
-- =====================================================================================

-- Activity log
CREATE POLICY "activity_log_select_own"
  ON activity_log FOR SELECT
  USING (profile_id = auth.uid());

CREATE POLICY "activity_log_insert"
  ON activity_log FOR INSERT
  WITH CHECK (TRUE);

-- Notifications
CREATE POLICY "notifications_select_own"
  ON notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "notifications_update_own"
  ON notifications FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "notifications_insert"
  ON notifications FOR INSERT
  WITH CHECK (TRUE);

CREATE POLICY "notifications_delete_own"
  ON notifications FOR DELETE
  USING (user_id = auth.uid());

-- Athlete analytics
CREATE POLICY "athlete_analytics_select_own"
  ON athlete_analytics FOR SELECT
  USING (
    athlete_id IN (SELECT id FROM athletes WHERE profile_id = auth.uid())
  );

-- Brand analytics
CREATE POLICY "brand_analytics_select_own"
  ON brand_analytics FOR SELECT
  USING (
    brand_id IN (SELECT id FROM brands WHERE profile_id = auth.uid())
  );

-- Compliance alerts (directors only)
CREATE POLICY "compliance_alerts_select_director"
  ON compliance_alerts FOR SELECT
  USING (
    school_id IN (SELECT school_id FROM athletic_directors WHERE profile_id = auth.uid())
  );

CREATE POLICY "compliance_alerts_update_director"
  ON compliance_alerts FOR UPDATE
  USING (
    school_id IN (SELECT school_id FROM athletic_directors WHERE profile_id = auth.uid())
  );

-- Profile views
CREATE POLICY "profile_views_insert"
  ON profile_views FOR INSERT
  WITH CHECK (TRUE);

CREATE POLICY "profile_views_select_own"
  ON profile_views FOR SELECT
  USING (
    athlete_id IN (SELECT id FROM athletes WHERE profile_id = auth.uid())
  );

-- Push subscriptions
CREATE POLICY "push_subscriptions_select_own"
  ON push_subscriptions FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "push_subscriptions_insert_own"
  ON push_subscriptions FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "push_subscriptions_update_own"
  ON push_subscriptions FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "push_subscriptions_delete_own"
  ON push_subscriptions FOR DELETE
  USING (user_id = auth.uid());

-- =====================================================================================
-- ENABLE REALTIME
-- =====================================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE deals;
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE deliverables;

-- =====================================================================================
-- COMMENTS
-- =====================================================================================

COMMENT ON POLICY "athletes_public_read_searchable" ON athletes IS 'Publicly searchable athletes can be viewed by anyone';
COMMENT ON POLICY "deals_directors_view" ON deals IS 'Athletic directors can view deals for athletes at their school';
COMMENT ON POLICY "verification_requests_update_director" ON verification_requests IS 'Directors can approve/reject verification requests';
