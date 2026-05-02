CREATE TYPE "public"."issue_priority" AS ENUM('no_priority', 'urgent', 'high', 'medium', 'low');
CREATE TYPE "public"."issue_status_type" AS ENUM('backlog', 'unstarted', 'started', 'completed', 'cancelled');
CREATE TYPE "public"."project_status" AS ENUM('backlog', 'planned', 'in_progress', 'completed', 'cancelled');

CREATE TABLE "users" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "email" text NOT NULL,
  "avatar_url" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "users_email_unique" UNIQUE("email")
);

CREATE TABLE "teams" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "identifier" text NOT NULL,
  "description" text,
  "color" text DEFAULT '#5E6AD2',
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "teams_identifier_unique" UNIQUE("identifier")
);

CREATE TABLE "team_members" (
  "team_id" uuid NOT NULL REFERENCES "public"."teams"("id") ON DELETE cascade,
  "user_id" uuid NOT NULL REFERENCES "public"."users"("id") ON DELETE cascade,
  "role" text DEFAULT 'member' NOT NULL,
  "joined_at" timestamp DEFAULT now() NOT NULL,
  PRIMARY KEY ("team_id", "user_id")
);

CREATE TABLE "issue_statuses" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "team_id" uuid NOT NULL REFERENCES "public"."teams"("id") ON DELETE cascade,
  "name" text NOT NULL,
  "color" text DEFAULT '#95A2B3' NOT NULL,
  "type" "issue_status_type" NOT NULL,
  "position" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "labels" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "team_id" uuid NOT NULL REFERENCES "public"."teams"("id") ON DELETE cascade,
  "name" text NOT NULL,
  "color" text DEFAULT '#95A2B3' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "projects" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "team_id" uuid NOT NULL REFERENCES "public"."teams"("id") ON DELETE cascade,
  "name" text NOT NULL,
  "description" text,
  "status" "project_status" DEFAULT 'planned' NOT NULL,
  "color" text DEFAULT '#5E6AD2',
  "start_date" timestamp,
  "target_date" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "schedules" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "team_id" uuid NOT NULL REFERENCES "public"."teams"("id") ON DELETE cascade,
  "name" text NOT NULL,
  "description" text,
  "prompt" text NOT NULL,
  "cron_expression" text,
  "working_directory" text NOT NULL,
  "model" text DEFAULT 'claude-sonnet-4-6' NOT NULL,
  "permission_mode" text DEFAULT 'ask' NOT NULL,
  "enabled" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "cron_tasks" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "schedule_id" uuid NOT NULL REFERENCES "public"."schedules"("id") ON DELETE cascade,
  "status" text DEFAULT 'pending' NOT NULL,
  "started_at" timestamp,
  "finished_at" timestamp,
  "output" text,
  "exit_code" integer,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "issues" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "team_id" uuid NOT NULL REFERENCES "public"."teams"("id") ON DELETE cascade,
  "project_id" uuid REFERENCES "public"."projects"("id") ON DELETE set null,
  "assignee_id" uuid REFERENCES "public"."users"("id") ON DELETE set null,
  "status_id" uuid NOT NULL REFERENCES "public"."issue_statuses"("id"),
  "title" text NOT NULL,
  "description" text,
  "priority" "issue_priority" DEFAULT 'no_priority' NOT NULL,
  "estimate" integer,
  "due_date" timestamp,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "issue_labels" (
  "issue_id" uuid NOT NULL REFERENCES "public"."issues"("id") ON DELETE cascade,
  "label_id" uuid NOT NULL REFERENCES "public"."labels"("id") ON DELETE cascade
);

CREATE TABLE "comments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "issue_id" uuid NOT NULL REFERENCES "public"."issues"("id") ON DELETE cascade,
  "content" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "issue_history" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "issue_id" uuid NOT NULL REFERENCES "public"."issues"("id") ON DELETE cascade,
  "field" text NOT NULL,
  "old_value" text,
  "new_value" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "roadmaps" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "roadmap_projects" (
  "roadmap_id" uuid NOT NULL REFERENCES "public"."roadmaps"("id") ON DELETE cascade,
  "project_id" uuid NOT NULL REFERENCES "public"."projects"("id") ON DELETE cascade
);

CREATE TABLE "views" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "team_id" uuid REFERENCES "public"."teams"("id") ON DELETE cascade,
  "name" text NOT NULL,
  "description" text,
  "filters" text DEFAULT '{}' NOT NULL,
  "is_shared" boolean DEFAULT false NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
