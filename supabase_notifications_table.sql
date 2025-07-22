-- Create notifications table
CREATE TABLE notifications (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL, -- The user who will receive the notification
  type VARCHAR(50) NOT NULL CHECK (type IN ('favorite', 'watchlist', 'message', 'listing_sold', 'listing_inquiry')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}', -- Store additional data like listing_id, sender_id, etc.
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- For referencing the listing that triggered the notification
  listing_id uuid,
  
  -- For referencing the user who triggered the notification (e.g., who favorited, who sent message)
  actor_id TEXT
  
  -- Note: Foreign key removed due to type mismatch - handle cleanup in application logic
);

-- Create indexes for better performance
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = false;

-- Enable Row Level Security (RLS)
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can only see their own notifications
CREATE POLICY "Users can view their own notifications" ON notifications
  FOR SELECT USING (auth.jwt() ->> 'email' = user_id);

-- Users can only update their own notifications (to mark as read)
CREATE POLICY "Users can update their own notifications" ON notifications
  FOR UPDATE USING (auth.jwt() ->> 'email' = user_id);

-- System can insert notifications for any user
CREATE POLICY "System can insert notifications" ON notifications
  FOR INSERT WITH CHECK (true);

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_notifications_updated_at ON notifications;
CREATE TRIGGER update_notifications_updated_at
  BEFORE UPDATE ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_notifications_updated_at();

-- Create function to get unread notification count for a user
CREATE OR REPLACE FUNCTION get_unread_notification_count(p_user_id TEXT)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM notifications
    WHERE user_id = p_user_id AND is_read = false
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION get_unread_notification_count(TEXT) TO authenticated;

-- Create function to mark all notifications as read for a user
CREATE OR REPLACE FUNCTION mark_all_notifications_read(p_user_id TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE notifications
  SET is_read = true, updated_at = NOW()
  WHERE user_id = p_user_id AND is_read = false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION mark_all_notifications_read(TEXT) TO authenticated;

-- Create function to create a favorite/watchlist notification
CREATE OR REPLACE FUNCTION create_favorite_notification()
RETURNS TRIGGER AS $$
DECLARE
  listing_record RECORD;
  actor_name TEXT;
  notification_title TEXT;
  notification_message TEXT;
BEGIN
  -- Get listing details
  SELECT l.*, us.display_name as owner_name
  INTO listing_record
  FROM listings l
  LEFT JOIN user_settings us ON l.user_id = us.email
  WHERE l.id = NEW.listing_id;
  
  -- Get actor name
  SELECT COALESCE(display_name, email) INTO actor_name
  FROM user_settings
  WHERE email = NEW.user_id;
  
  -- Don't create notification if user is favoriting their own listing
  IF NEW.user_id = listing_record.user_id THEN
    RETURN NEW;
  END IF;
  
  -- Create notification message
  IF NEW.type = 'favorite' THEN
    notification_title := 'Someone favorited your listing';
    notification_message := actor_name || ' favorited your listing "' || listing_record.title || '"';
  ELSE
    notification_title := 'Someone added your listing to their watchlist';
    notification_message := actor_name || ' added your listing "' || listing_record.title || '" to their watchlist';
  END IF;
  
  -- Insert notification
  INSERT INTO notifications (
    user_id,
    type,
    title,
    message,
    listing_id,
    actor_id,
    data
  ) VALUES (
    listing_record.user_id,
    NEW.type,
    notification_title,
    notification_message,
    NEW.listing_id,
    NEW.user_id,
    jsonb_build_object(
      'listing_title', listing_record.title,
      'listing_price', listing_record.price,
      '    listing_image', CASE WHEN listing_record.images IS NOT NULL AND array_length(listing_record.images, 1) > 0 
                            THEN listing_record.images[1] 
                            ELSE NULL END,
      'actor_name', actor_name
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for favorite/watchlist notifications
DROP TRIGGER IF EXISTS create_favorite_notification_trigger ON user_favorites;
CREATE TRIGGER create_favorite_notification_trigger
  AFTER INSERT ON user_favorites
  FOR EACH ROW
  EXECUTE FUNCTION create_favorite_notification();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON notifications TO authenticated;
GRANT USAGE ON SEQUENCE notifications_id_seq TO authenticated;

-- Alter notifications table to change listing_id type
ALTER TABLE notifications
ALTER COLUMN listing_id TYPE uuid
USING listing_id::uuid;