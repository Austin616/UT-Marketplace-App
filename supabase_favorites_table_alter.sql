-- Migration: Alter user_favorites.listing_id from BIGINT to UUID and update related functions/views

-- 1. Add a new UUID column
ALTER TABLE user_favorites ADD COLUMN listing_id_new UUID;

-- 2. Migrate data (assumes listing_id can be mapped to listings.id)
UPDATE user_favorites
SET listing_id_new = listings.id
FROM listings
WHERE user_favorites.listing_id::text = listings.id::text;

-- 3. Drop dependent view first
DROP VIEW IF EXISTS listing_favorite_counts;

-- 4. Drop old foreign key and column
ALTER TABLE user_favorites DROP CONSTRAINT IF EXISTS user_favorites_listing_id_fkey;
ALTER TABLE user_favorites DROP COLUMN listing_id;

-- 5. Rename new column
ALTER TABLE user_favorites RENAME COLUMN listing_id_new TO listing_id;

-- 6. Add new foreign key
ALTER TABLE user_favorites
ADD CONSTRAINT user_favorites_listing_id_fkey
FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE;

-- 7. Update indexes
DROP INDEX IF EXISTS idx_user_favorites_listing_id;
CREATE INDEX idx_user_favorites_listing_id ON user_favorites(listing_id);

-- 8. Drop and recreate functions and view with UUID
DROP FUNCTION IF EXISTS get_user_listing_status(TEXT, BIGINT);
DROP FUNCTION IF EXISTS toggle_user_favorite(TEXT, BIGINT, VARCHAR);

-- 9. Recreate view
CREATE VIEW listing_favorite_counts AS
SELECT 
  listing_id,
  COUNT(*) FILTER (WHERE type = 'favorite') as favorite_count,
  COUNT(*) FILTER (WHERE type = 'watchlist') as watchlist_count,
  COUNT(*) as total_count
FROM user_favorites
GROUP BY listing_id;

GRANT SELECT ON listing_favorite_counts TO authenticated;

-- 10. Recreate get_user_listing_status with UUID
CREATE OR REPLACE FUNCTION get_user_listing_status(p_user_id TEXT, p_listing_id UUID)
RETURNS TABLE(
  is_favorited BOOLEAN,
  is_watchlisted BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    EXISTS(SELECT 1 FROM user_favorites WHERE user_id = p_user_id AND listing_id = p_listing_id AND type = 'favorite') as is_favorited,
    EXISTS(SELECT 1 FROM user_favorites WHERE user_id = p_user_id AND listing_id = p_listing_id AND type = 'watchlist') as is_watchlisted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_user_listing_status(TEXT, UUID) TO authenticated;

-- 11. Recreate toggle_user_favorite with UUID
CREATE OR REPLACE FUNCTION toggle_user_favorite(p_user_id TEXT, p_listing_id UUID, p_type VARCHAR(20))
RETURNS BOOLEAN AS $$
DECLARE
  exists_already BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM user_favorites 
    WHERE user_id = p_user_id AND listing_id = p_listing_id AND type = p_type
  ) INTO exists_already;
  
  IF exists_already THEN
    DELETE FROM user_favorites 
    WHERE user_id = p_user_id AND listing_id = p_listing_id AND type = p_type;
    RETURN FALSE;
  ELSE
    INSERT INTO user_favorites (user_id, listing_id, type)
    VALUES (p_user_id, p_listing_id, p_type)
    ON CONFLICT (user_id, listing_id, type) DO NOTHING;
    RETURN TRUE;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION toggle_user_favorite(TEXT, UUID, VARCHAR) TO authenticated; 