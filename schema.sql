


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgjwt" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."cleanup_old_notifications"("days_old" integer DEFAULT 30) RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM notifications 
    WHERE created_at < NOW() - INTERVAL '1 day' * days_old
    AND is_read = TRUE;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$;


ALTER FUNCTION "public"."cleanup_old_notifications"("days_old" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_favorite_notification"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."create_favorite_notification"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_notification"("p_user_id" "text", "p_type" "text", "p_title" "text", "p_message" "text", "p_actor_id" "text" DEFAULT NULL::"text", "p_data" "jsonb" DEFAULT '{}'::"jsonb", "p_listing_id" "uuid" DEFAULT NULL::"uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  DECLARE
      notification_id UUID;
  BEGIN
      -- Don't send notification to yourself
      IF p_user_id = p_actor_id THEN
          RETURN NULL;
      END IF;

      -- Debug logging
      RAISE NOTICE 'create_notification called with: 
  user_id=%, actor_id=%, type=%, listing_id=%, data=%',
          p_user_id, p_actor_id, p_type, p_listing_id,
  p_data;

      INSERT INTO notifications (
          user_id, actor_id, type, title, message, data,
  listing_id
      ) VALUES (
          p_user_id, p_actor_id, p_type, p_title, p_message,
  p_data, p_listing_id
      ) RETURNING id INTO notification_id;

      RAISE NOTICE 'Notification inserted successfully with 
  id=%', notification_id;

      RETURN notification_id;
  END;
  $$;


ALTER FUNCTION "public"."create_notification"("p_user_id" "text", "p_type" "text", "p_title" "text", "p_message" "text", "p_actor_id" "text", "p_data" "jsonb", "p_listing_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_unread_notification_count"("p_user_id" "text") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM notifications
    WHERE user_id = p_user_id AND is_read = false
  );
END;
$$;


ALTER FUNCTION "public"."get_unread_notification_count"("p_user_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_listing_status"("p_user_id" "text", "p_listing_id" "uuid") RETURNS TABLE("is_favorited" boolean, "is_watchlisted" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    EXISTS(SELECT 1 FROM user_favorites WHERE user_id = p_user_id AND listing_id = p_listing_id AND type = 'favorite') as is_favorited,
    EXISTS(SELECT 1 FROM user_favorites WHERE user_id = p_user_id AND listing_id = p_listing_id AND type = 'watchlist') as is_watchlisted;
END;
$$;


ALTER FUNCTION "public"."get_user_listing_status"("p_user_id" "text", "p_listing_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mark_all_notifications_read"("p_user_id" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  UPDATE notifications
  SET is_read = true, updated_at = NOW()
  WHERE user_id = p_user_id AND is_read = false;
END;
$$;


ALTER FUNCTION "public"."mark_all_notifications_read"("p_user_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notify_favorite_watchlist_change"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."notify_favorite_watchlist_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notify_new_message"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
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
            WHERE id = NEW.listing_id::UUID;
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
        p_listing_id := CASE 
            WHEN NEW.listing_id IS NOT NULL AND NEW.listing_id != '' 
            THEN 
                CASE 
                    WHEN NEW.listing_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
                    THEN NEW.listing_id::UUID 
                    ELSE NULL 
                END
            ELSE NULL 
        END
    );
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."notify_new_message"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notify_new_rating"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
      notification_message := rater_name || ' rated you ' ||
  star_emoji || ' (' || NEW.rating || '/5)';

      -- Add review text if provided
      IF NEW.comment IS NOT NULL AND NEW.comment != '' THEN
          notification_message := notification_message || ' 
  and left a review';
      END IF;

      -- Create notification for the rated user

      PERFORM create_notification(
          p_user_id := NEW.rated_id,
          p_actor_id := NEW.rater_id,
          p_type := 'message',
          p_title := notification_title,
          p_message := notification_message,
          p_data := jsonb_build_object(
              'rater_name', rater_name,
              'rating', NEW.rating,
              'review', NEW.comment,
              'star_emoji', star_emoji,
              'notification_type', 'rating'
          ),
          p_listing_id := NULL::UUID  
      );

      RETURN NEW;
  END;
  $$;


ALTER FUNCTION "public"."notify_new_rating"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."toggle_user_favorite"("p_user_id" "text", "p_listing_id" "uuid", "p_type" character varying) RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."toggle_user_favorite"("p_user_id" "text", "p_listing_id" "uuid", "p_type" character varying) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_notifications_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_notifications_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."user_favorites" (
    "id" bigint NOT NULL,
    "user_id" "text" NOT NULL,
    "type" character varying(20) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "listing_id" "uuid",
    CONSTRAINT "user_favorites_type_check" CHECK ((("type")::"text" = ANY ((ARRAY['favorite'::character varying, 'watchlist'::character varying])::"text"[])))
);


ALTER TABLE "public"."user_favorites" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."listing_favorite_counts" AS
 SELECT "user_favorites"."listing_id",
    "count"(*) FILTER (WHERE (("user_favorites"."type")::"text" = 'favorite'::"text")) AS "favorite_count",
    "count"(*) FILTER (WHERE (("user_favorites"."type")::"text" = 'watchlist'::"text")) AS "watchlist_count",
    "count"(*) AS "total_count"
   FROM "public"."user_favorites"
  GROUP BY "user_favorites"."listing_id";


ALTER TABLE "public"."listing_favorite_counts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."listings" (
    "title" "text" NOT NULL,
    "price" numeric,
    "user_id" "text",
    "description" "text",
    "category" "text",
    "location" "text",
    "created_at" timestamp with time zone,
    "user_name" "text",
    "images" "text"[],
    "condition" "text",
    "user_image" "text",
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "is_sold" boolean,
    "is_draft" boolean DEFAULT false,
    "location_lat" double precision,
    "location_lng" double precision
);


ALTER TABLE "public"."listings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "sender_id" "text" NOT NULL,
    "receiver_id" "text" NOT NULL,
    "content" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "read" boolean DEFAULT false,
    "listing_id" "text"
);


ALTER TABLE "public"."messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" bigint NOT NULL,
    "user_id" "text" NOT NULL,
    "type" character varying(50) NOT NULL,
    "title" "text" NOT NULL,
    "message" "text" NOT NULL,
    "data" "jsonb" DEFAULT '{}'::"jsonb",
    "is_read" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "listing_id" "uuid",
    "actor_id" "text",
    CONSTRAINT "notifications_type_check" CHECK ((("type")::"text" = ANY (ARRAY[('favorite'::character varying)::"text", ('watchlist'::character varying)::"text", ('message'::character varying)::"text", ('listing_sold'::character varying)::"text", ('listing_inquiry'::character varying)::"text", ('rating'::character varying)::"text"])))
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."notifications_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."notifications_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."notifications_id_seq" OWNED BY "public"."notifications"."id";



CREATE TABLE IF NOT EXISTS "public"."ratings" (
    "id" bigint NOT NULL,
    "rater_id" "text" NOT NULL,
    "rated_id" "text",
    "rating" numeric,
    "comment" "text",
    "created_at" "text"
);


ALTER TABLE "public"."ratings" OWNER TO "postgres";


ALTER TABLE "public"."ratings" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."ratings_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE SEQUENCE IF NOT EXISTS "public"."user_favorites_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."user_favorites_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."user_favorites_id_seq" OWNED BY "public"."user_favorites"."id";



CREATE TABLE IF NOT EXISTS "public"."user_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text" NOT NULL,
    "display_name" "text",
    "bio" "text",
    "notification_preferences" "jsonb" DEFAULT '{"email_notifications": true, "browser_notifications": true}'::"jsonb",
    "profile_image_url" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."user_settings" OWNER TO "postgres";


ALTER TABLE ONLY "public"."notifications" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."notifications_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."user_favorites" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."user_favorites_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."listings"
    ADD CONSTRAINT "listings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ratings"
    ADD CONSTRAINT "ratings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_favorites"
    ADD CONSTRAINT "user_favorites_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_favorites"
    ADD CONSTRAINT "user_favorites_user_listing_type_unique" UNIQUE ("user_id", "listing_id", "type");



ALTER TABLE ONLY "public"."user_settings"
    ADD CONSTRAINT "user_settings_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."user_settings"
    ADD CONSTRAINT "user_settings_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_listings_is_draft" ON "public"."listings" USING "btree" ("is_draft");



CREATE INDEX "idx_messages_listing_id" ON "public"."messages" USING "btree" ("listing_id");



CREATE INDEX "idx_notifications_created_at" ON "public"."notifications" USING "btree" ("created_at");



CREATE INDEX "idx_notifications_is_read" ON "public"."notifications" USING "btree" ("is_read");



CREATE INDEX "idx_notifications_type" ON "public"."notifications" USING "btree" ("type");



CREATE INDEX "idx_notifications_user_id" ON "public"."notifications" USING "btree" ("user_id");



CREATE INDEX "idx_notifications_user_unread" ON "public"."notifications" USING "btree" ("user_id", "is_read") WHERE ("is_read" = false);



CREATE INDEX "idx_user_favorites_listing_id" ON "public"."user_favorites" USING "btree" ("listing_id");



CREATE INDEX "idx_user_favorites_type" ON "public"."user_favorites" USING "btree" ("type");



CREATE INDEX "idx_user_favorites_user_id" ON "public"."user_favorites" USING "btree" ("user_id");



CREATE INDEX "idx_user_favorites_user_type" ON "public"."user_favorites" USING "btree" ("user_id", "type");



CREATE INDEX "messages_created_at_idx" ON "public"."messages" USING "btree" ("created_at");



CREATE INDEX "messages_receiver_id_idx" ON "public"."messages" USING "btree" ("receiver_id");



CREATE INDEX "messages_sender_id_idx" ON "public"."messages" USING "btree" ("sender_id");



CREATE OR REPLACE TRIGGER "create_favorite_notification_trigger" AFTER INSERT ON "public"."user_favorites" FOR EACH ROW EXECUTE FUNCTION "public"."create_favorite_notification"();



CREATE OR REPLACE TRIGGER "trigger_notify_favorite_watchlist" AFTER INSERT ON "public"."user_favorites" FOR EACH ROW EXECUTE FUNCTION "public"."notify_favorite_watchlist_change"();



CREATE OR REPLACE TRIGGER "trigger_notify_new_message" AFTER INSERT ON "public"."messages" FOR EACH ROW EXECUTE FUNCTION "public"."notify_new_message"();



CREATE OR REPLACE TRIGGER "trigger_notify_new_rating" AFTER INSERT ON "public"."ratings" FOR EACH ROW EXECUTE FUNCTION "public"."notify_new_rating"();



CREATE OR REPLACE TRIGGER "update_notifications_updated_at" BEFORE UPDATE ON "public"."notifications" FOR EACH ROW EXECUTE FUNCTION "public"."update_notifications_updated_at"();



CREATE OR REPLACE TRIGGER "update_user_favorites_updated_at" BEFORE UPDATE ON "public"."user_favorites" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_user_settings_updated_at" BEFORE UPDATE ON "public"."user_settings" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."user_favorites"
    ADD CONSTRAINT "user_favorites_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE CASCADE;



CREATE POLICY "Allow all inserts" ON "public"."listings" FOR INSERT WITH CHECK (true);



CREATE POLICY "Delte for all users" ON "public"."listings" FOR DELETE USING (true);



CREATE POLICY "Enable insert access for authenticated users" ON "public"."user_settings" FOR INSERT WITH CHECK (true);



CREATE POLICY "Enable read access for all users" ON "public"."listings" FOR SELECT USING (true);



CREATE POLICY "Enable read access for authenticated users" ON "public"."user_settings" FOR SELECT USING (true);



CREATE POLICY "Enable update access for authenticated users" ON "public"."user_settings" FOR UPDATE USING (true);



CREATE POLICY "Users can delete their own favorites" ON "public"."user_favorites" FOR DELETE USING ((("auth"."jwt"() ->> 'email'::"text") = "user_id"));



CREATE POLICY "Users can insert their own favorites" ON "public"."user_favorites" FOR INSERT WITH CHECK ((("auth"."jwt"() ->> 'email'::"text") = "user_id"));



CREATE POLICY "Users can update their own favorites" ON "public"."user_favorites" FOR UPDATE USING ((("auth"."jwt"() ->> 'email'::"text") = "user_id"));



CREATE POLICY "Users can update their own notifications" ON "public"."notifications" FOR UPDATE USING ((("auth"."jwt"() ->> 'email'::"text") = "user_id"));



CREATE POLICY "Users can view their own favorites" ON "public"."user_favorites" FOR SELECT USING ((("auth"."jwt"() ->> 'email'::"text") = "user_id"));



CREATE POLICY "Users can view their own notifications" ON "public"."notifications" FOR SELECT USING ((("auth"."jwt"() ->> 'email'::"text") = "user_id"));



CREATE POLICY "all" ON "public"."ratings" USING (true) WITH CHECK (true);



CREATE POLICY "allow update" ON "public"."listings" FOR UPDATE USING (true) WITH CHECK (true);



ALTER TABLE "public"."listings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ratings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "rls_notifications_insert_system" ON "public"."notifications" FOR INSERT WITH CHECK (true);



CREATE POLICY "rls_notifications_select_user" ON "public"."notifications" FOR SELECT USING (("user_id" = ("auth"."jwt"() ->> 'email'::"text")));



CREATE POLICY "rls_notifications_update_user" ON "public"."notifications" FOR UPDATE USING (("user_id" = ("auth"."jwt"() ->> 'email'::"text")));



ALTER TABLE "public"."user_favorites" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_settings" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."messages";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";











































































































































































GRANT ALL ON FUNCTION "public"."cleanup_old_notifications"("days_old" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_old_notifications"("days_old" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_old_notifications"("days_old" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."create_favorite_notification"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_favorite_notification"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_favorite_notification"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_notification"("p_user_id" "text", "p_type" "text", "p_title" "text", "p_message" "text", "p_actor_id" "text", "p_data" "jsonb", "p_listing_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."create_notification"("p_user_id" "text", "p_type" "text", "p_title" "text", "p_message" "text", "p_actor_id" "text", "p_data" "jsonb", "p_listing_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_notification"("p_user_id" "text", "p_type" "text", "p_title" "text", "p_message" "text", "p_actor_id" "text", "p_data" "jsonb", "p_listing_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_unread_notification_count"("p_user_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_unread_notification_count"("p_user_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_unread_notification_count"("p_user_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_listing_status"("p_user_id" "text", "p_listing_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_listing_status"("p_user_id" "text", "p_listing_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_listing_status"("p_user_id" "text", "p_listing_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."mark_all_notifications_read"("p_user_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."mark_all_notifications_read"("p_user_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."mark_all_notifications_read"("p_user_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_favorite_watchlist_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_favorite_watchlist_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_favorite_watchlist_change"() TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_new_message"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_new_message"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_new_message"() TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_new_rating"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_new_rating"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_new_rating"() TO "service_role";



GRANT ALL ON FUNCTION "public"."toggle_user_favorite"("p_user_id" "text", "p_listing_id" "uuid", "p_type" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."toggle_user_favorite"("p_user_id" "text", "p_listing_id" "uuid", "p_type" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."toggle_user_favorite"("p_user_id" "text", "p_listing_id" "uuid", "p_type" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."update_notifications_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_notifications_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_notifications_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";


















GRANT ALL ON TABLE "public"."user_favorites" TO "anon";
GRANT ALL ON TABLE "public"."user_favorites" TO "authenticated";
GRANT ALL ON TABLE "public"."user_favorites" TO "service_role";



GRANT ALL ON TABLE "public"."listing_favorite_counts" TO "anon";
GRANT ALL ON TABLE "public"."listing_favorite_counts" TO "authenticated";
GRANT ALL ON TABLE "public"."listing_favorite_counts" TO "service_role";



GRANT ALL ON TABLE "public"."listings" TO "anon";
GRANT ALL ON TABLE "public"."listings" TO "authenticated";
GRANT ALL ON TABLE "public"."listings" TO "service_role";



GRANT ALL ON TABLE "public"."messages" TO "anon";
GRANT ALL ON TABLE "public"."messages" TO "authenticated";
GRANT ALL ON TABLE "public"."messages" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON SEQUENCE "public"."notifications_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."notifications_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."notifications_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."ratings" TO "anon";
GRANT ALL ON TABLE "public"."ratings" TO "authenticated";
GRANT ALL ON TABLE "public"."ratings" TO "service_role";



GRANT ALL ON SEQUENCE "public"."ratings_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."ratings_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."ratings_id_seq" TO "service_role";



GRANT ALL ON SEQUENCE "public"."user_favorites_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."user_favorites_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."user_favorites_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."user_settings" TO "anon";
GRANT ALL ON TABLE "public"."user_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."user_settings" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "service_role";






























RESET ALL;
