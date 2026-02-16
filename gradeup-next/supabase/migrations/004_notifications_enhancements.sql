-- =====================================================================================
-- GradeUp NIL - Notifications Table Enhancements
-- Version: 004
-- Description: Extend notifications table with additional fields for enhanced UX
-- =====================================================================================

-- Add url column for direct navigation from notifications
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS url TEXT;

-- Add read_at timestamp for tracking when notifications were read
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;

-- Extend notification_type enum to include more specific types
-- Note: PostgreSQL doesn't allow easy enum modification, so we'll use text with a check constraint instead
-- First, check if the type column is still an enum and needs migration
DO $$
BEGIN
  -- If the column exists and is the old enum type, we need to handle it
  -- For new installations, the column will be TEXT with the new check constraint
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notifications'
    AND column_name = 'type'
    AND udt_name = 'notification_type'
  ) THEN
    -- Drop the existing constraint if it exists
    ALTER TABLE notifications ALTER COLUMN type TYPE TEXT;

    -- Add new check constraint with extended types
    ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
    ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
      CHECK (type IN (
        'deal',
        'deal_offer',
        'deal_accepted',
        'deal_rejected',
        'deal_completed',
        'deal_cancelled',
        'message',
        'message_received',
        'payment',
        'payment_received',
        'payment_pending',
        'system',
        'verification_approved',
        'verification_rejected',
        'verification_request',
        'opportunity_match',
        'profile_view'
      ));
  END IF;
END $$;

-- Create index on url for faster lookups
CREATE INDEX IF NOT EXISTS idx_notifications_url ON notifications(url) WHERE url IS NOT NULL;

-- Create index on read_at for analytics
CREATE INDEX IF NOT EXISTS idx_notifications_read_at ON notifications(read_at) WHERE read_at IS NOT NULL;

-- Add trigger to update read_at when read is set to true
CREATE OR REPLACE FUNCTION update_notification_read_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.read = TRUE AND OLD.read = FALSE THEN
    NEW.read_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_notification_read_at_trigger ON notifications;
CREATE TRIGGER update_notification_read_at_trigger
  BEFORE UPDATE ON notifications
  FOR EACH ROW EXECUTE FUNCTION update_notification_read_at();

-- Policy to allow users to delete their own notifications
CREATE POLICY IF NOT EXISTS "Users can delete own notifications"
  ON notifications FOR DELETE
  USING (user_id = auth.uid());

-- =====================================================================================
-- MIGRATION COMPLETE
-- =====================================================================================

COMMENT ON COLUMN notifications.url IS 'Direct navigation URL for the notification action';
COMMENT ON COLUMN notifications.read_at IS 'Timestamp when the notification was marked as read';
