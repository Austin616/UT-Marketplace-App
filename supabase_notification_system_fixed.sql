-- Complete Notification System for UT Marketplace (FIXED VERSION)
-- This file contains all necessary SQL for implementing notifications

-- 1. First, create the notifications table if it doesn't exist
CREATE TABLE IF NOT EXISTS notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL, -- The user who receives the notification
    actor_id TEXT, -- The user who triggered the notification
    type TEXT NOT NULL CHECK (type IN ('favorite', 'watchlist', 'message', 'rating', 'listing_sold', 'listing_inquiry')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    data JSONB DEFAULT '{}',
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    listing_id INTEGER -- Reference to the listing if applicable (no foreign key constraint)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_listing_id ON notifications(listing_id);

-- 2. Function to create a notification
CREATE OR REPLACE FUNCTION create_notification(
    p_user_id TEXT,
    p_type TEXT,
    p_title TEXT,
    p_message TEXT,
    p_actor_id TEXT DEFAULT NULL,
    p_data JSONB DEFAULT '{}',
    p_listing_id INTEGER DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    notification_id UUID;
BEGIN
    -- Don't send notification to yourself
    IF p_user_id = p_actor_id THEN
        RETURN NULL;
    END IF;
    
    INSERT INTO notifications (
        user_id, actor_id, type, title, message, data, listing_id
    ) VALUES (
        p_user_id, p_actor_id, p_type, p_title, p_message, p_data, p_listing_id
    ) RETURNING id INTO notification_id;
    
    RETURN notification_id;
END;
$$ LANGUAGE plpgsql;

-- 3. Function to mark all notifications as read for a user
CREATE OR REPLACE FUNCTION mark_all_notifications_read(p_user_id TEXT)
RETURNS VOID AS $$
BEGIN
    UPDATE notifications 
    SET is_read = TRUE 
    WHERE user_id = p_user_id AND is_read = FALSE;
END;
$$ LANGUAGE plpgsql;

-- 4. TRIGGER FUNCTIONS for automatic notifications

-- Function for favorite/watchlist notifications
CREATE OR REPLACE FUNCTION notify_favorite_watchlist_change()
RETURNS TRIGGER AS $$
DECLARE
    listing_owner TEXT;
    listing_title TEXT;
    listing_price NUMERIC;
    listing_image TEXT;
    actor_name TEXT;
    action_type TEXT;
    notification_title TEXT;
    notification_message TEXT;
BEGIN
    -- Get listing details
    SELECT user_id, title, price, 
           CASE WHEN images IS NOT NULL AND array_length(images, 1) > 0 
                THEN images[1] 
                ELSE NULL 
           END
    INTO listing_owner, listing_title, listing_price, listing_image
    FROM listings 
    WHERE id = NEW.listing_id;
    
    -- Skip if listing not found
    IF listing_owner IS NULL THEN
        RETURN NEW;
    END IF;
    
    -- Get actor name
    SELECT COALESCE(display_name, email) INTO actor_name
    FROM user_settings 
    WHERE email = NEW.user_id;
    
    IF actor_name IS NULL THEN
        actor_name := NEW.user_id;
    END IF;
    
    -- Determine action type and messages
    IF NEW.type = 'favorite' THEN
        action_type := 'favorite';
        notification_title := '❤️ Someone liked your listing!';
        notification_message := actor_name || ' added "' || listing_title || '" to their favorites';
    ELSIF NEW.type = 'watchlist' THEN
        action_type := 'watchlist';
        notification_title := '👀 Someone is watching your listing!';
        notification_message := actor_name || ' added "' || listing_title || '" to their watchlist';
    ELSE
        -- Skip if not favorite or watchlist
        RETURN NEW;
    END IF;
    
    -- Create notification for listing owner
    PERFORM create_notification(
        p_user_id := listing_owner,
        p_actor_id := NEW.user_id,
        p_type := action_type,
        p_title := notification_title,
        p_message := notification_message,
        p_data := jsonb_build_object(
            'listing_title', listing_title,
            'listing_price', listing_price,
            'listing_image', listing_image,
            'actor_name', actor_name
        ),
        p_listing_id := NEW.listing_id
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function for message notifications
CREATE OR REPLACE FUNCTION notify_new_message()
RETURNS TRIGGER AS $$
DECLARE
    sender_name TEXT;
    listing_title TEXT;
    listing_price NUMERIC;
    listing_image TEXT;
    notification_title TEXT;
    notification_message TEXT;
    message_preview TEXT;
BEGIN
    -- Get sender name
    SELECT COALESCE(display_name, email) INTO sender_name
    FROM user_settings 
    WHERE email = NEW.sender_id;
    
    IF sender_name IS NULL THEN
        sender_name := NEW.sender_id;
    END IF;
    
    -- Get listing details if this is a listing-specific message
    IF NEW.listing_id IS NOT NULL AND NEW.listing_id != '' THEN
        BEGIN
            SELECT title, price, 
                   CASE WHEN images IS NOT NULL AND array_length(images, 1) > 0 
                        THEN images[1] 
                        ELSE NULL 
                   END
            INTO listing_title, listing_price, listing_image
            FROM listings 
            WHERE id = NEW.listing_id::INTEGER;
        EXCEPTION WHEN OTHERS THEN
            -- If casting fails or listing not found, treat as general message
            listing_title := NULL;
        END;
        
        IF listing_title IS NOT NULL THEN
            notification_title := '💬 New message about your listing';
            notification_message := sender_name || ' sent you a message about "' || listing_title || '"';
        ELSE
            notification_title := '💬 New message';
            notification_message := sender_name || ' sent you a message';
        END IF;
    ELSE
        notification_title := '💬 New message';
        notification_message := sender_name || ' sent you a message';
    END IF;
    
    -- Create message preview (first 100 characters)
    message_preview := CASE 
        WHEN LENGTH(NEW.content) > 100 THEN LEFT(NEW.content, 100) || '...'
        ELSE NEW.content
    END;
    
    -- Create notification for message receiver
    PERFORM create_notification(
        p_user_id := NEW.receiver_id,
        p_actor_id := NEW.sender_id,
        p_type := 'message',
        p_title := notification_title,
        p_message := notification_message,
        p_data := jsonb_build_object(
            'sender_name', sender_name,
            'message_preview', message_preview,
            'listing_title', listing_title,
            'listing_price', listing_price,
            'listing_image', listing_image
        ),
        p_listing_id := CASE WHEN NEW.listing_id IS NOT NULL AND NEW.listing_id != '' 
                              THEN NEW.listing_id::INTEGER 
                              ELSE NULL 
                         END
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function for rating/review notifications
CREATE OR REPLACE FUNCTION notify_new_rating()
RETURNS TRIGGER AS $$
DECLARE
    rater_name TEXT;
    notification_title TEXT;
    notification_message TEXT;
    star_emoji TEXT;
BEGIN
    -- Get rater name
    SELECT COALESCE(display_name, email) INTO rater_name
    FROM user_settings 
    WHERE email = NEW.rater_id;
    
    IF rater_name IS NULL THEN
        rater_name := NEW.rater_id;
    END IF;
    
    -- Create star emoji based on rating
    star_emoji := CASE 
        WHEN NEW.rating >= 5 THEN '⭐⭐⭐⭐⭐'
        WHEN NEW.rating >= 4 THEN '⭐⭐⭐⭐'
        WHEN NEW.rating >= 3 THEN '⭐⭐⭐'
        WHEN NEW.rating >= 2 THEN '⭐⭐'
        ELSE '⭐'
    END;
    
    notification_title := '⭐ New rating received!';
    notification_message := rater_name || ' rated you ' || star_emoji || ' (' || NEW.rating || '/5)';
    
    -- Add review text if provided
    IF NEW.comment IS NOT NULL AND NEW.comment != '' THEN
        notification_message := notification_message || ' and left a review';
    END IF;
    
    -- Create notification for the rated user
    PERFORM create_notification(
        p_user_id := NEW.rated_id,
        p_actor_id := NEW.rater_id,
        p_type := 'rating',
        p_title := notification_title,
        p_message := notification_message,
        p_data := jsonb_build_object(
            'rater_name', rater_name,
            'rating', NEW.rating,
            'review', NEW.comment,
            'star_emoji', star_emoji
        )
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. CREATE TRIGGERS

-- Trigger for favorite/watchlist changes (only on INSERT - when someone adds to favorites/watchlist)
DROP TRIGGER IF EXISTS trigger_notify_favorite_watchlist ON user_favorites;
CREATE TRIGGER trigger_notify_favorite_watchlist
    AFTER INSERT ON user_favorites
    FOR EACH ROW
    EXECUTE FUNCTION notify_favorite_watchlist_change();

-- Trigger for new messages
DROP TRIGGER IF EXISTS trigger_notify_new_message ON messages;
CREATE TRIGGER trigger_notify_new_message
    AFTER INSERT ON messages
    FOR EACH ROW
    EXECUTE FUNCTION notify_new_message();

-- Trigger for new ratings
DROP TRIGGER IF EXISTS trigger_notify_new_rating ON ratings;
CREATE TRIGGER trigger_notify_new_rating
    AFTER INSERT ON ratings
    FOR EACH ROW
    EXECUTE FUNCTION notify_new_rating();

-- 6. Utility functions for the app

-- Function to get unread notification count
CREATE OR REPLACE FUNCTION get_unread_notification_count(p_user_id TEXT)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)
        FROM notifications
        WHERE user_id = p_user_id AND is_read = FALSE
    );
END;
$$ LANGUAGE plpgsql;

-- Function to cleanup old notifications (optional - run periodically)
CREATE OR REPLACE FUNCTION cleanup_old_notifications(days_old INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM notifications 
    WHERE created_at < NOW() - INTERVAL '1 day' * days_old
    AND is_read = TRUE;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Enable Row Level Security (RLS) for notifications table
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own notifications
DROP POLICY IF EXISTS notifications_select_policy ON notifications;
CREATE POLICY notifications_select_policy ON notifications
    FOR SELECT
    USING (user_id = auth.jwt() ->> 'email');

-- Policy: Users can only update their own notifications (mark as read)
DROP POLICY IF EXISTS notifications_update_policy ON notifications;
CREATE POLICY notifications_update_policy ON notifications
    FOR UPDATE
    USING (user_id = auth.jwt() ->> 'email');

-- Grant necessary permissions
GRANT SELECT, UPDATE ON notifications TO authenticated;
GRANT EXECUTE ON FUNCTION create_notification TO authenticated;
GRANT EXECUTE ON FUNCTION mark_all_notifications_read TO authenticated;
GRANT EXECUTE ON FUNCTION get_unread_notification_count TO authenticated;

-- Optional: Create a view for notification statistics
CREATE OR REPLACE VIEW notification_stats AS
SELECT 
    user_id,
    COUNT(*) as total_notifications,
    COUNT(*) FILTER (WHERE is_read = FALSE) as unread_notifications,
    COUNT(*) FILTER (WHERE type = 'favorite') as favorite_notifications,
    COUNT(*) FILTER (WHERE type = 'watchlist') as watchlist_notifications,
    COUNT(*) FILTER (WHERE type = 'message') as message_notifications,
    COUNT(*) FILTER (WHERE type = 'rating') as rating_notifications,
    MAX(created_at) as last_notification_at
FROM notifications
GROUP BY user_id;

GRANT SELECT ON notification_stats TO authenticated;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Notification system setup completed successfully!';
    RAISE NOTICE 'You can now test notifications by:';
    RAISE NOTICE '1. Adding listings to favorites/watchlist';
    RAISE NOTICE '2. Sending messages between users';
    RAISE NOTICE '3. Rating users';
END $$;