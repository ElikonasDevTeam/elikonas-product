


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



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."claim_founding_member_slot"("cap" integer DEFAULT 1000) RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  new_count integer;
begin
  update founding_member_counter
  set claimed = claimed + 1
  where claimed < cap
  returning claimed into new_count;
  return new_count;
end;
$$;


ALTER FUNCTION "public"."claim_founding_member_slot"("cap" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."current_user_role"() RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
    select coalesce(                                                            
      (select role from profiles where id = auth.uid()),
      'learner'                                                                 
    )                                                       
  $$;


ALTER FUNCTION "public"."current_user_role"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."decrement_group_member_count"("gid" "uuid") RETURNS "void"
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
    update groups set member_count = greatest(0, member_count - 1) where id =   
  gid;
  $$;


ALTER FUNCTION "public"."decrement_group_member_count"("gid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_unique_profile_slug"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
declare
  base_slug text;
  candidate text;
  suffix integer := 0;
  reserved text[] := array[
    'account','ai-guide','api','assessment','auth','bookstore',
    'check-email','forgot-password','groups','learner','learning-library',
    'login','musings','notifications','onboarding','people','profile',
    'provider','register','reset-password','signup','tidings','in',
    'admin','support','settings','help','about','elikonas'
  ];
begin
  if new.slug is not null and new.slug <> '' then
    return new;
  end if;

  base_slug := slugify_text(coalesce(new.full_name, 'learner'));
  if base_slug = '' then
    base_slug := 'learner';
  end if;

  candidate := base_slug;
  loop
    exit when candidate <> all(reserved)
      and not exists (select 1 from profiles where slug = candidate and id <> new.id);
    suffix := suffix + 1;
    candidate := base_slug || '-' || suffix;
  end loop;

  new.slug := candidate;
  return new;
end;
$$;


ALTER FUNCTION "public"."generate_unique_profile_slug"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_group_member_count"("gid" "uuid") RETURNS "void"
    LANGUAGE "sql" SECURITY DEFINER
    AS $$                              
    update groups set member_count = member_count + 1 where id = gid;
  $$;


ALTER FUNCTION "public"."increment_group_member_count"("gid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."rls_auto_enable"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."slugify_text"("input" "text") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE
    AS $$
  select trim(both '-' from regexp_replace(lower(coalesce(input, '')), '[^a-z0-9]+', '-', 'g'));
$$;


ALTER FUNCTION "public"."slugify_text"("input" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."toggle_group_post_like"("p_post_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
  declare                                                                       
    already_liked boolean;                                  
    p_user_id uuid := auth.uid();
  begin                                                                         
    select exists(
      select 1 from group_post_likes where post_id = p_post_id and user_id =    
  p_user_id                                                                     
    ) into already_liked;
    if already_liked then                                                       
      delete from group_post_likes where post_id = p_post_id and user_id =
  p_user_id;
      update group_posts set like_count = greatest(0, like_count - 1) where id =
   p_post_id;                                                                   
      return false;
    else                                                                        
      insert into group_post_likes (post_id, user_id) values (p_post_id,
  p_user_id);                                                                   
      update group_posts set like_count = like_count + 1 where id = p_post_id;
      return true;                                                              
    end if;                                                 
  end;                                                                          
  $$;


ALTER FUNCTION "public"."toggle_group_post_like"("p_post_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."assessment_responses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "session_id" "uuid" NOT NULL,
    "question_number" integer NOT NULL,
    "answer" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "assessment_responses_answer_check" CHECK ((("answer" >= 1) AND ("answer" <= 5)))
);


ALTER TABLE "public"."assessment_responses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."assessment_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "completed_at" timestamp with time zone,
    "realistic_score" numeric(4,1),
    "investigative_score" numeric(4,1),
    "artistic_score" numeric(4,1),
    "social_score" numeric(4,1),
    "enterprising_score" numeric(4,1),
    "conventional_score" numeric(4,1),
    "top_area" "text",
    "second_area" "text",
    "third_area" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "riasec_scores" "jsonb"
);


ALTER TABLE "public"."assessment_sessions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."connections" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "requester_id" "uuid" NOT NULL,
    "addressee_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "connection_type" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "connections_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'accepted'::"text", 'declined'::"text"])))
);


ALTER TABLE "public"."connections" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."consent_records" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "tos_version" "text" NOT NULL,
    "privacy_version" "text" NOT NULL,
    "consented_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "ip_address" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."consent_records" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ed_units" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "provider" "text" NOT NULL,
    "category" "text" NOT NULL,
    "status" "text" DEFAULT 'planned'::"text" NOT NULL,
    "progress_pct" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "ed_units_progress_pct_check" CHECK ((("progress_pct" >= 0) AND ("progress_pct" <= 100))),
    CONSTRAINT "ed_units_status_check" CHECK (("status" = ANY (ARRAY['completed'::"text", 'in_progress'::"text", 'planned'::"text"])))
);


ALTER TABLE "public"."ed_units" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ed_units_catalog" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "provider" "text" NOT NULL,
    "topic" "text" NOT NULL,
    "format" "text" DEFAULT 'course'::"text" NOT NULL,
    "duration_estimate" "text",
    "cost" "text",
    "url" "text",
    "description" "text" DEFAULT ''::"text" NOT NULL,
    "prerequisites" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "fts" "tsvector" GENERATED ALWAYS AS ("to_tsvector"('"english"'::"regconfig", ((((((((COALESCE("title", ''::"text") || ' '::"text") || COALESCE("description", ''::"text")) || ' '::"text") || COALESCE("topic", ''::"text")) || ' '::"text") || COALESCE("provider", ''::"text")) || ' '::"text") || COALESCE("prerequisites", ''::"text")))) STORED
);


ALTER TABLE "public"."ed_units_catalog" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."eli_conversations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "title" "text" DEFAULT 'New conversation'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."eli_conversations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."eli_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "conversation_id" "uuid" NOT NULL,
    "role" "text" NOT NULL,
    "content" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "eli_messages_role_check" CHECK (("role" = ANY (ARRAY['user'::"text", 'assistant'::"text"])))
);


ALTER TABLE "public"."eli_messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."founding_member_counter" (
    "id" boolean DEFAULT true NOT NULL,
    "claimed" integer DEFAULT 0 NOT NULL,
    CONSTRAINT "single_row" CHECK ("id")
);


ALTER TABLE "public"."founding_member_counter" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."founding_member_overflow" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "stripe_session_id" "text",
    "stripe_customer_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "resolved" boolean DEFAULT false NOT NULL,
    "notes" "text"
);


ALTER TABLE "public"."founding_member_overflow" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."founding_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "stripe_session_id" "text",
    "tier" "text" DEFAULT 'premium'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."founding_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."group_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "group_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "text" DEFAULT 'member'::"text" NOT NULL,
    "joined_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "group_members_role_check" CHECK (("role" = ANY (ARRAY['member'::"text", 'admin'::"text"])))
);


ALTER TABLE "public"."group_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."group_post_likes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "post_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."group_post_likes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."group_posts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "group_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "author_name" "text" NOT NULL,
    "body" "text" NOT NULL,
    "hashtags" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "like_count" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."group_posts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."groups" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text" NOT NULL,
    "topic" "text" NOT NULL,
    "is_private" boolean DEFAULT false NOT NULL,
    "created_by" "uuid" NOT NULL,
    "member_count" integer DEFAULT 1 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."groups" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."musing_likes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "musing_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."musing_likes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."musings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "author_name" "text" NOT NULL,
    "author_tagline" "text",
    "hashtags" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "body" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "visibility" "text" DEFAULT 'inner_circle'::"text" NOT NULL,
    CONSTRAINT "musings_visibility_check" CHECK (("visibility" = ANY (ARRAY['public'::"text", 'inner_circle'::"text"])))
);


ALTER TABLE "public"."musings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "message" "text" NOT NULL,
    "read" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "notifications_type_check" CHECK (("type" = ANY (ARRAY['new_like'::"text", 'new_comment'::"text", 'new_connection'::"text", 'connection_accepted'::"text", 'system'::"text"])))
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "full_name" "text",
    "email" "text",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "interests" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "role" "text" DEFAULT 'learner'::"text" NOT NULL,
    "first_name" "text",
    "last_name" "text",
    "country" "text",
    "phone" "text",
    "sms_notifications_enabled" boolean DEFAULT false,
    "profile_slug" "text",
    "is_founding_member" boolean DEFAULT false,
    "founding_member_since" timestamp with time zone,
    "subscription_tier" "text" DEFAULT 'free'::"text",
    "stripe_customer_id" "text",
    "stripe_subscription_id" "text",
    "founding_member_tier" "text",
    "founding_member" boolean DEFAULT false NOT NULL,
    "founding_member_number" integer,
    "slug" "text",
    CONSTRAINT "profiles_founding_member_tier_check" CHECK ((("founding_member_tier" = ANY (ARRAY['alpha'::"text", 'premium'::"text"])) OR ("founding_member_tier" IS NULL))),
    CONSTRAINT "profiles_role_check" CHECK (("role" = ANY (ARRAY['learner'::"text", 'provider'::"text", 'admin'::"text"]))),
    CONSTRAINT "profiles_slug_lowercase" CHECK (("slug" = "lower"("slug"))),
    CONSTRAINT "profiles_subscription_tier_check" CHECK (("subscription_tier" = ANY (ARRAY['free'::"text", 'founding'::"text", 'standard'::"text"])))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."reports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "reporter_id" "uuid",
    "content_type" "text" NOT NULL,
    "content_id" "uuid" NOT NULL,
    "reason" "text" NOT NULL,
    "details" "text",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "zendesk_ticket_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "musing_content" "text",
    "poster_email" "text",
    "reporter_email" "text",
    CONSTRAINT "reports_content_type_check" CHECK (("content_type" = ANY (ARRAY['musing'::"text", 'profile'::"text", 'comment'::"text"]))),
    CONSTRAINT "reports_reason_check" CHECK (("reason" = ANY (ARRAY['spam'::"text", 'harassment'::"text", 'hate_speech'::"text", 'sensitive_personal_information'::"text", 'inappropriate_content'::"text", 'other'::"text", 'ai_moderation_flag'::"text", 'moderation_check_failed'::"text"]))),
    CONSTRAINT "reports_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'reviewing'::"text", 'resolved'::"text", 'dismissed'::"text"])))
);


ALTER TABLE "public"."reports" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tidings_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "thread_id" "uuid" NOT NULL,
    "sender_id" "uuid" NOT NULL,
    "recipient_id" "uuid" NOT NULL,
    "body" "text" NOT NULL,
    "read" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."tidings_messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tidings_threads" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "participant_a" "uuid" NOT NULL,
    "participant_b" "uuid" NOT NULL,
    "last_message_preview" "text",
    "last_message_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "participant_order" CHECK (("participant_a" < "participant_b"))
);


ALTER TABLE "public"."tidings_threads" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_privacy_settings" (
    "user_id" "uuid" NOT NULL,
    "show_interests" boolean DEFAULT false NOT NULL,
    "show_edunits_count" boolean DEFAULT false NOT NULL,
    "show_progress_pct" boolean DEFAULT false NOT NULL,
    "show_planned_units" boolean DEFAULT false NOT NULL,
    "show_learning_record" boolean DEFAULT false NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_privacy_settings" OWNER TO "postgres";


ALTER TABLE ONLY "public"."assessment_responses"
    ADD CONSTRAINT "assessment_responses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."assessment_sessions"
    ADD CONSTRAINT "assessment_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."connections"
    ADD CONSTRAINT "connections_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."connections"
    ADD CONSTRAINT "connections_requester_id_addressee_id_key" UNIQUE ("requester_id", "addressee_id");



ALTER TABLE ONLY "public"."consent_records"
    ADD CONSTRAINT "consent_records_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ed_units_catalog"
    ADD CONSTRAINT "ed_units_catalog_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ed_units"
    ADD CONSTRAINT "ed_units_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."eli_conversations"
    ADD CONSTRAINT "eli_conversations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."eli_messages"
    ADD CONSTRAINT "eli_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."founding_member_counter"
    ADD CONSTRAINT "founding_member_counter_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."founding_member_overflow"
    ADD CONSTRAINT "founding_member_overflow_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."founding_members"
    ADD CONSTRAINT "founding_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."group_members"
    ADD CONSTRAINT "group_members_group_id_user_id_key" UNIQUE ("group_id", "user_id");



ALTER TABLE ONLY "public"."group_members"
    ADD CONSTRAINT "group_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."group_post_likes"
    ADD CONSTRAINT "group_post_likes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."group_post_likes"
    ADD CONSTRAINT "group_post_likes_post_id_user_id_key" UNIQUE ("post_id", "user_id");



ALTER TABLE ONLY "public"."group_posts"
    ADD CONSTRAINT "group_posts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."groups"
    ADD CONSTRAINT "groups_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."musing_likes"
    ADD CONSTRAINT "musing_likes_musing_id_user_id_key" UNIQUE ("musing_id", "user_id");



ALTER TABLE ONLY "public"."musing_likes"
    ADD CONSTRAINT "musing_likes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."musings"
    ADD CONSTRAINT "musings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_profile_slug_key" UNIQUE ("profile_slug");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."reports"
    ADD CONSTRAINT "reports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tidings_messages"
    ADD CONSTRAINT "tidings_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tidings_threads"
    ADD CONSTRAINT "tidings_threads_participant_a_participant_b_key" UNIQUE ("participant_a", "participant_b");



ALTER TABLE ONLY "public"."tidings_threads"
    ADD CONSTRAINT "tidings_threads_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_privacy_settings"
    ADD CONSTRAINT "user_privacy_settings_pkey" PRIMARY KEY ("user_id");



CREATE INDEX "assessment_responses_session_idx" ON "public"."assessment_responses" USING "btree" ("session_id");



CREATE INDEX "assessment_sessions_completed_idx" ON "public"."assessment_sessions" USING "btree" ("user_id", "completed_at" DESC);



CREATE INDEX "assessment_sessions_user_idx" ON "public"."assessment_sessions" USING "btree" ("user_id");



CREATE INDEX "consent_records_user_id_idx" ON "public"."consent_records" USING "btree" ("user_id");



CREATE INDEX "ed_units_catalog_fts_idx" ON "public"."ed_units_catalog" USING "gin" ("fts");



CREATE INDEX "ed_units_user_id_idx" ON "public"."ed_units" USING "btree" ("user_id");



CREATE INDEX "eli_conversations_user_updated_idx" ON "public"."eli_conversations" USING "btree" ("user_id", "updated_at" DESC);



CREATE INDEX "eli_messages_conversation_created_idx" ON "public"."eli_messages" USING "btree" ("conversation_id", "created_at");



CREATE INDEX "profiles_phone_idx" ON "public"."profiles" USING "btree" ("phone");



CREATE UNIQUE INDEX "profiles_slug_idx" ON "public"."profiles" USING "btree" ("profile_slug");



CREATE UNIQUE INDEX "profiles_slug_unique_idx" ON "public"."profiles" USING "btree" ("profile_slug") WHERE ("profile_slug" IS NOT NULL);



CREATE INDEX "reports_content_idx" ON "public"."reports" USING "btree" ("content_type", "content_id");



CREATE INDEX "reports_reporter_idx" ON "public"."reports" USING "btree" ("reporter_id");



CREATE INDEX "reports_status_idx" ON "public"."reports" USING "btree" ("status");



CREATE OR REPLACE TRIGGER "reports_updated_at" BEFORE UPDATE ON "public"."reports" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "trg_generate_profile_slug" BEFORE INSERT ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."generate_unique_profile_slug"();



ALTER TABLE ONLY "public"."assessment_responses"
    ADD CONSTRAINT "assessment_responses_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."assessment_sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."assessment_sessions"
    ADD CONSTRAINT "assessment_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."connections"
    ADD CONSTRAINT "connections_addressee_id_fkey" FOREIGN KEY ("addressee_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."connections"
    ADD CONSTRAINT "connections_requester_id_fkey" FOREIGN KEY ("requester_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."consent_records"
    ADD CONSTRAINT "consent_records_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ed_units"
    ADD CONSTRAINT "ed_units_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."eli_conversations"
    ADD CONSTRAINT "eli_conversations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."eli_messages"
    ADD CONSTRAINT "eli_messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."eli_conversations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."founding_member_overflow"
    ADD CONSTRAINT "founding_member_overflow_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."founding_members"
    ADD CONSTRAINT "founding_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."group_members"
    ADD CONSTRAINT "group_members_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."group_members"
    ADD CONSTRAINT "group_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."group_post_likes"
    ADD CONSTRAINT "group_post_likes_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."group_posts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."group_post_likes"
    ADD CONSTRAINT "group_post_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."group_posts"
    ADD CONSTRAINT "group_posts_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."group_posts"
    ADD CONSTRAINT "group_posts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."groups"
    ADD CONSTRAINT "groups_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."musing_likes"
    ADD CONSTRAINT "musing_likes_musing_id_fkey" FOREIGN KEY ("musing_id") REFERENCES "public"."musings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."musing_likes"
    ADD CONSTRAINT "musing_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."musings"
    ADD CONSTRAINT "musings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reports"
    ADD CONSTRAINT "reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tidings_messages"
    ADD CONSTRAINT "tidings_messages_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tidings_messages"
    ADD CONSTRAINT "tidings_messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tidings_messages"
    ADD CONSTRAINT "tidings_messages_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "public"."tidings_threads"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tidings_threads"
    ADD CONSTRAINT "tidings_threads_participant_a_fkey" FOREIGN KEY ("participant_a") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tidings_threads"
    ADD CONSTRAINT "tidings_threads_participant_b_fkey" FOREIGN KEY ("participant_b") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_privacy_settings"
    ADD CONSTRAINT "user_privacy_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Addressees can update connection status" ON "public"."connections" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "addressee_id"));



CREATE POLICY "Allow AI moderation inserts" ON "public"."reports" FOR INSERT WITH CHECK ((("reporter_id" = "auth"."uid"()) OR ("reporter_id" IS NULL)));



CREATE POLICY "Anyone authenticated can read likes" ON "public"."musing_likes" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Anyone authenticated can view likes" ON "public"."group_post_likes" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Anyone authenticated can view memberships" ON "public"."group_members" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can create groups" ON "public"."groups" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "created_by"));



CREATE POLICY "Authenticated users can create threads" ON "public"."tidings_threads" FOR INSERT TO "authenticated" WITH CHECK ((("auth"."uid"() = "participant_a") OR ("auth"."uid"() = "participant_b")));



CREATE POLICY "Authenticated users can read founding member count" ON "public"."founding_member_counter" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can read privacy settings" ON "public"."user_privacy_settings" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can read profiles" ON "public"."profiles" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can view accessible groups" ON "public"."groups" FOR SELECT TO "authenticated" USING (((NOT "is_private") OR ("created_by" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."group_members"
  WHERE (("group_members"."group_id" = "groups"."id") AND ("group_members"."user_id" = "auth"."uid"()))))));



CREATE POLICY "Author or group creator can delete posts" ON "public"."group_posts" FOR DELETE TO "authenticated" USING ((("auth"."uid"() = "user_id") OR (EXISTS ( SELECT 1
   FROM "public"."groups"
  WHERE (("groups"."id" = "group_posts"."group_id") AND ("groups"."created_by" = "auth"."uid"()))))));



CREATE POLICY "Members can leave; creators can remove members" ON "public"."group_members" FOR DELETE TO "authenticated" USING ((("auth"."uid"() = "user_id") OR (EXISTS ( SELECT 1
   FROM "public"."groups"
  WHERE (("groups"."id" = "group_members"."group_id") AND ("groups"."created_by" = "auth"."uid"()))))));



CREATE POLICY "Members can post" ON "public"."group_posts" FOR INSERT TO "authenticated" WITH CHECK ((("auth"."uid"() = "user_id") AND (EXISTS ( SELECT 1
   FROM "public"."group_members" "gm"
  WHERE (("gm"."group_id" = "group_posts"."group_id") AND ("gm"."user_id" = "auth"."uid"()))))));



CREATE POLICY "Members can view posts in their groups (public groups open to  " ON "public"."group_posts" FOR SELECT TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."groups" "g"
  WHERE (("g"."id" = "group_posts"."group_id") AND (NOT "g"."is_private")))) OR (EXISTS ( SELECT 1
   FROM "public"."group_members" "gm"
  WHERE (("gm"."group_id" = "group_posts"."group_id") AND ("gm"."user_id" = "auth"."uid"()))))));



CREATE POLICY "Musings visible by audience" ON "public"."musings" FOR SELECT TO "authenticated" USING ((("visibility" = 'public'::"text") OR ("auth"."uid"() = "user_id") OR (("visibility" = 'inner_circle'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."connections" "c"
  WHERE (("c"."status" = 'accepted'::"text") AND ((("c"."requester_id" = "auth"."uid"()) AND ("c"."addressee_id" = "musings"."user_id")) OR (("c"."addressee_id" = "auth"."uid"()) AND ("c"."requester_id" = "musings"."user_id")))))))));



CREATE POLICY "Only creator can delete groups" ON "public"."groups" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "created_by"));



CREATE POLICY "Only creator can update groups" ON "public"."groups" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "created_by"));



CREATE POLICY "Participants can read messages" ON "public"."tidings_messages" FOR SELECT TO "authenticated" USING ((("auth"."uid"() = "sender_id") OR ("auth"."uid"() = "recipient_id")));



CREATE POLICY "Participants can read their threads" ON "public"."tidings_threads" FOR SELECT TO "authenticated" USING ((("auth"."uid"() = "participant_a") OR ("auth"."uid"() = "participant_b")));



CREATE POLICY "Recipients can mark messages as read" ON "public"."tidings_messages" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "recipient_id"));



CREATE POLICY "Service role can insert consent records" ON "public"."consent_records" FOR INSERT WITH CHECK (true);



CREATE POLICY "Service role only" ON "public"."founding_members" USING (false);



CREATE POLICY "Users can create reports" ON "public"."reports" FOR INSERT WITH CHECK (("auth"."uid"() = "reporter_id"));



CREATE POLICY "Users can delete their own ed_units" ON "public"."ed_units" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own likes" ON "public"."musing_likes" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own musings" ON "public"."musings" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own profile" ON "public"."profiles" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can insert their own ed_units" ON "public"."ed_units" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own likes" ON "public"."musing_likes" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own musings" ON "public"."musings" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own privacy settings" ON "public"."user_privacy_settings" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can join public groups or own created groups" ON "public"."group_members" FOR INSERT TO "authenticated" WITH CHECK ((("auth"."uid"() = "user_id") AND ((EXISTS ( SELECT 1
   FROM "public"."groups"
  WHERE (("groups"."id" = "group_members"."group_id") AND (NOT "groups"."is_private")))) OR (EXISTS ( SELECT 1
   FROM "public"."groups"
  WHERE (("groups"."id" = "group_members"."group_id") AND ("groups"."created_by" = "auth"."uid"())))))));



CREATE POLICY "Users can like posts in groups they belong to" ON "public"."group_post_likes" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage own assessment responses" ON "public"."assessment_responses" USING (("session_id" IN ( SELECT "assessment_sessions"."id"
   FROM "public"."assessment_sessions"
  WHERE ("assessment_sessions"."user_id" = "auth"."uid"())))) WITH CHECK (("session_id" IN ( SELECT "assessment_sessions"."id"
   FROM "public"."assessment_sessions"
  WHERE ("assessment_sessions"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can manage own assessment sessions" ON "public"."assessment_sessions" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can read their own connections" ON "public"."connections" FOR SELECT TO "authenticated" USING ((("auth"."uid"() = "requester_id") OR ("auth"."uid"() = "addressee_id")));



CREATE POLICY "Users can read their own ed_units" ON "public"."ed_units" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can read their own notifications" ON "public"."notifications" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can remove their own likes" ON "public"."group_post_likes" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can send connection requests" ON "public"."connections" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "requester_id"));



CREATE POLICY "Users can send messages" ON "public"."tidings_messages" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "sender_id"));



CREATE POLICY "Users can update own profile" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "id")) WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can update their own notifications" ON "public"."notifications" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own privacy settings" ON "public"."user_privacy_settings" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own consent record" ON "public"."consent_records" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own reports" ON "public"."reports" FOR SELECT USING (("auth"."uid"() = "reporter_id"));



CREATE POLICY "admins can read all profiles" ON "public"."profiles" FOR SELECT TO "authenticated" USING (("public"."current_user_role"() = 'admin'::"text"));



ALTER TABLE "public"."assessment_responses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."assessment_sessions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "authenticated users can read active catalog" ON "public"."ed_units_catalog" FOR SELECT TO "authenticated" USING (("is_active" = true));



ALTER TABLE "public"."connections" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."consent_records" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ed_units" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ed_units_catalog" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."eli_conversations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."eli_messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."founding_member_counter" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."founding_member_overflow" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."founding_members" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."group_members" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."group_post_likes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."group_posts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."groups" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."musing_likes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."musings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."reports" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tidings_messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tidings_threads" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_privacy_settings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "users can delete own conversations" ON "public"."eli_conversations" FOR DELETE TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "users can insert own conversations" ON "public"."eli_conversations" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "users can insert own messages" ON "public"."eli_messages" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."eli_conversations"
  WHERE (("eli_conversations"."id" = "eli_messages"."conversation_id") AND ("eli_conversations"."user_id" = "auth"."uid"())))));



CREATE POLICY "users can insert own profile" ON "public"."profiles" FOR INSERT TO "authenticated" WITH CHECK ((("id" = "auth"."uid"()) AND ("role" = 'learner'::"text")));



CREATE POLICY "users can read own profile" ON "public"."profiles" FOR SELECT TO "authenticated" USING (("id" = "auth"."uid"()));



CREATE POLICY "users can select own conversations" ON "public"."eli_conversations" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "users can select own messages" ON "public"."eli_messages" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."eli_conversations"
  WHERE (("eli_conversations"."id" = "eli_messages"."conversation_id") AND ("eli_conversations"."user_id" = "auth"."uid"())))));



CREATE POLICY "users can update own conversations" ON "public"."eli_conversations" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "users can update own profile" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (("id" = "auth"."uid"())) WITH CHECK ((("id" = "auth"."uid"()) AND ("role" = "public"."current_user_role"())));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."tidings_messages";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";






















































































































































REVOKE ALL ON FUNCTION "public"."claim_founding_member_slot"("cap" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."claim_founding_member_slot"("cap" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."current_user_role"() TO "anon";
GRANT ALL ON FUNCTION "public"."current_user_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."current_user_role"() TO "service_role";



GRANT ALL ON FUNCTION "public"."decrement_group_member_count"("gid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."decrement_group_member_count"("gid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."decrement_group_member_count"("gid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_unique_profile_slug"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_unique_profile_slug"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_unique_profile_slug"() TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_group_member_count"("gid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."increment_group_member_count"("gid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_group_member_count"("gid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "anon";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "service_role";



GRANT ALL ON FUNCTION "public"."slugify_text"("input" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."slugify_text"("input" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."slugify_text"("input" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."toggle_group_post_like"("p_post_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."toggle_group_post_like"("p_post_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."toggle_group_post_like"("p_post_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "service_role";


















GRANT ALL ON TABLE "public"."assessment_responses" TO "anon";
GRANT ALL ON TABLE "public"."assessment_responses" TO "authenticated";
GRANT ALL ON TABLE "public"."assessment_responses" TO "service_role";



GRANT ALL ON TABLE "public"."assessment_sessions" TO "anon";
GRANT ALL ON TABLE "public"."assessment_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."assessment_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."connections" TO "anon";
GRANT ALL ON TABLE "public"."connections" TO "authenticated";
GRANT ALL ON TABLE "public"."connections" TO "service_role";



GRANT ALL ON TABLE "public"."consent_records" TO "anon";
GRANT ALL ON TABLE "public"."consent_records" TO "authenticated";
GRANT ALL ON TABLE "public"."consent_records" TO "service_role";



GRANT ALL ON TABLE "public"."ed_units" TO "anon";
GRANT ALL ON TABLE "public"."ed_units" TO "authenticated";
GRANT ALL ON TABLE "public"."ed_units" TO "service_role";



GRANT ALL ON TABLE "public"."ed_units_catalog" TO "anon";
GRANT ALL ON TABLE "public"."ed_units_catalog" TO "authenticated";
GRANT ALL ON TABLE "public"."ed_units_catalog" TO "service_role";



GRANT ALL ON TABLE "public"."eli_conversations" TO "anon";
GRANT ALL ON TABLE "public"."eli_conversations" TO "authenticated";
GRANT ALL ON TABLE "public"."eli_conversations" TO "service_role";



GRANT ALL ON TABLE "public"."eli_messages" TO "anon";
GRANT ALL ON TABLE "public"."eli_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."eli_messages" TO "service_role";



GRANT ALL ON TABLE "public"."founding_member_counter" TO "anon";
GRANT ALL ON TABLE "public"."founding_member_counter" TO "authenticated";
GRANT ALL ON TABLE "public"."founding_member_counter" TO "service_role";



GRANT ALL ON TABLE "public"."founding_member_overflow" TO "anon";
GRANT ALL ON TABLE "public"."founding_member_overflow" TO "authenticated";
GRANT ALL ON TABLE "public"."founding_member_overflow" TO "service_role";



GRANT ALL ON TABLE "public"."founding_members" TO "anon";
GRANT ALL ON TABLE "public"."founding_members" TO "authenticated";
GRANT ALL ON TABLE "public"."founding_members" TO "service_role";



GRANT ALL ON TABLE "public"."group_members" TO "anon";
GRANT ALL ON TABLE "public"."group_members" TO "authenticated";
GRANT ALL ON TABLE "public"."group_members" TO "service_role";



GRANT ALL ON TABLE "public"."group_post_likes" TO "anon";
GRANT ALL ON TABLE "public"."group_post_likes" TO "authenticated";
GRANT ALL ON TABLE "public"."group_post_likes" TO "service_role";



GRANT ALL ON TABLE "public"."group_posts" TO "anon";
GRANT ALL ON TABLE "public"."group_posts" TO "authenticated";
GRANT ALL ON TABLE "public"."group_posts" TO "service_role";



GRANT ALL ON TABLE "public"."groups" TO "anon";
GRANT ALL ON TABLE "public"."groups" TO "authenticated";
GRANT ALL ON TABLE "public"."groups" TO "service_role";



GRANT ALL ON TABLE "public"."musing_likes" TO "anon";
GRANT ALL ON TABLE "public"."musing_likes" TO "authenticated";
GRANT ALL ON TABLE "public"."musing_likes" TO "service_role";



GRANT ALL ON TABLE "public"."musings" TO "anon";
GRANT ALL ON TABLE "public"."musings" TO "authenticated";
GRANT ALL ON TABLE "public"."musings" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."reports" TO "anon";
GRANT ALL ON TABLE "public"."reports" TO "authenticated";
GRANT ALL ON TABLE "public"."reports" TO "service_role";



GRANT ALL ON TABLE "public"."tidings_messages" TO "anon";
GRANT ALL ON TABLE "public"."tidings_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."tidings_messages" TO "service_role";



GRANT ALL ON TABLE "public"."tidings_threads" TO "anon";
GRANT ALL ON TABLE "public"."tidings_threads" TO "authenticated";
GRANT ALL ON TABLE "public"."tidings_threads" TO "service_role";



GRANT ALL ON TABLE "public"."user_privacy_settings" TO "anon";
GRANT ALL ON TABLE "public"."user_privacy_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."user_privacy_settings" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";



































