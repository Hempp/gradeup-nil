-- =====================================================================================
-- GradeUp NIL - Messaging Schema
-- Version: 005
-- Description: Conversations, messages, and message attachments tables
-- =====================================================================================

-- =====================================================================================
-- CONVERSATIONS TABLE
-- =====================================================================================

CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Optional deal association
  deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,

  -- Conversation metadata
  subject TEXT,
  is_archived BOOLEAN DEFAULT FALSE,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================================================
-- CONVERSATION PARTICIPANTS TABLE
-- =====================================================================================

CREATE TABLE conversation_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role user_role NOT NULL,

  -- Participant status
  is_active BOOLEAN DEFAULT TRUE,
  last_read_at TIMESTAMPTZ,
  muted_until TIMESTAMPTZ,

  -- Timestamps
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  left_at TIMESTAMPTZ,

  UNIQUE(conversation_id, user_id)
);

-- =====================================================================================
-- MESSAGES TABLE
-- =====================================================================================

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Message content
  content TEXT NOT NULL,
  content_type TEXT DEFAULT 'text',  -- text, system, deal_update

  -- Message metadata
  is_system_message BOOLEAN DEFAULT FALSE,
  reply_to_id UUID REFERENCES messages(id),

  -- Read tracking
  read_at TIMESTAMPTZ,

  -- Edit/Delete tracking
  is_edited BOOLEAN DEFAULT FALSE,
  edited_at TIMESTAMPTZ,
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================================================
-- MESSAGE ATTACHMENTS TABLE
-- =====================================================================================

CREATE TABLE message_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,

  -- File info
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,

  -- Preview/Thumbnail
  thumbnail_url TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================================================
-- MESSAGE REACTIONS TABLE
-- =====================================================================================

CREATE TABLE message_reactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(message_id, user_id, emoji)
);

-- =====================================================================================
-- INDEXES
-- =====================================================================================

-- Conversation indexes
CREATE INDEX idx_conversations_deal_id ON conversations(deal_id);
CREATE INDEX idx_conversations_updated_at ON conversations(updated_at DESC);
CREATE INDEX idx_conversations_active ON conversations(is_archived) WHERE is_archived = FALSE;

-- Conversation participant indexes
CREATE INDEX idx_conversation_participants_user_id ON conversation_participants(user_id);
CREATE INDEX idx_conversation_participants_conversation_id ON conversation_participants(conversation_id);
CREATE INDEX idx_conversation_participants_active ON conversation_participants(is_active) WHERE is_active = TRUE;

-- Message indexes
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX idx_messages_unread ON messages(read_at) WHERE read_at IS NULL;
CREATE INDEX idx_messages_reply_to ON messages(reply_to_id) WHERE reply_to_id IS NOT NULL;
CREATE INDEX idx_messages_not_deleted ON messages(is_deleted) WHERE is_deleted = FALSE;

-- Message attachment indexes
CREATE INDEX idx_message_attachments_message_id ON message_attachments(message_id);

-- Message reaction indexes
CREATE INDEX idx_message_reactions_message_id ON message_reactions(message_id);
CREATE INDEX idx_message_reactions_user_id ON message_reactions(user_id);

-- =====================================================================================
-- TRIGGERS
-- =====================================================================================

CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update conversation timestamp on new message
CREATE OR REPLACE FUNCTION update_conversation_on_new_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations
  SET updated_at = NOW()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_conversation_timestamp
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION update_conversation_on_new_message();

-- =====================================================================================
-- HELPER FUNCTIONS
-- =====================================================================================

-- Function to get or create conversation for a deal
CREATE OR REPLACE FUNCTION get_or_create_deal_conversation(
  p_deal_id UUID,
  p_athlete_profile_id UUID,
  p_brand_profile_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_conversation_id UUID;
BEGIN
  -- Check if conversation exists for this deal
  SELECT id INTO v_conversation_id
  FROM conversations
  WHERE deal_id = p_deal_id
  LIMIT 1;

  IF v_conversation_id IS NOT NULL THEN
    RETURN v_conversation_id;
  END IF;

  -- Create new conversation
  INSERT INTO conversations (deal_id)
  VALUES (p_deal_id)
  RETURNING id INTO v_conversation_id;

  -- Add participants
  INSERT INTO conversation_participants (conversation_id, user_id, role)
  VALUES
    (v_conversation_id, p_athlete_profile_id, 'athlete'),
    (v_conversation_id, p_brand_profile_id, 'brand');

  RETURN v_conversation_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get unread message count for user
CREATE OR REPLACE FUNCTION get_unread_message_count(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  unread_count INTEGER;
BEGIN
  SELECT COUNT(*)::INTEGER INTO unread_count
  FROM messages m
  JOIN conversation_participants cp ON m.conversation_id = cp.conversation_id
  WHERE cp.user_id = p_user_id
    AND m.sender_id != p_user_id
    AND m.read_at IS NULL
    AND m.is_deleted = FALSE;

  RETURN unread_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================================================
-- COMMENTS
-- =====================================================================================

COMMENT ON TABLE conversations IS 'Chat conversations between users, optionally linked to deals';
COMMENT ON TABLE conversation_participants IS 'Users participating in each conversation';
COMMENT ON TABLE messages IS 'Individual messages within conversations';
COMMENT ON TABLE message_attachments IS 'File attachments for messages';
COMMENT ON TABLE message_reactions IS 'Emoji reactions on messages';
COMMENT ON COLUMN messages.content_type IS 'Type of message: text, system, deal_update';
COMMENT ON COLUMN conversation_participants.muted_until IS 'Mute notifications until this timestamp';
