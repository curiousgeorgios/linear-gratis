import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ─── Enums ────────────────────────────────────────────────────────────────────

export const issuePriorityEnum = pgEnum('issue_priority', [
  'no_priority',
  'urgent',
  'high',
  'medium',
  'low',
]);

export const issueStatusTypeEnum = pgEnum('issue_status_type', [
  'backlog',
  'unstarted',
  'started',
  'completed',
  'cancelled',
]);

export const projectStatusEnum = pgEnum('project_status', [
  'backlog',
  'planned',
  'in_progress',
  'completed',
  'cancelled',
]);

// ─── Users ────────────────────────────────────────────────────────────────────

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  avatarUrl: text('avatar_url'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ─── Teams ────────────────────────────────────────────────────────────────────

export const teams = pgTable('teams', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  identifier: text('identifier').notNull().unique(), // e.g. "ENG", "DESIGN"
  description: text('description'),
  color: text('color').default('#5E6AD2'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ─── Team Members ─────────────────────────────────────────────────────────────

export const teamMembers = pgTable('team_members', {
  teamId: uuid('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: text('role').notNull().default('member'), // 'owner' | 'member'
  joinedAt: timestamp('joined_at').defaultNow().notNull(),
});

// ─── Issue Statuses ───────────────────────────────────────────────────────────

export const issueStatuses = pgTable('issue_statuses', {
  id: uuid('id').defaultRandom().primaryKey(),
  teamId: uuid('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  color: text('color').notNull().default('#95A2B3'),
  type: issueStatusTypeEnum('type').notNull(),
  position: integer('position').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ─── Labels ───────────────────────────────────────────────────────────────────

export const labels = pgTable('labels', {
  id: uuid('id').defaultRandom().primaryKey(),
  teamId: uuid('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  color: text('color').notNull().default('#95A2B3'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ─── Projects ─────────────────────────────────────────────────────────────────

export const projects = pgTable('projects', {
  id: uuid('id').defaultRandom().primaryKey(),
  teamId: uuid('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  status: projectStatusEnum('status').notNull().default('planned'),
  color: text('color').default('#5E6AD2'),
  startDate: timestamp('start_date'),
  targetDate: timestamp('target_date'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ─── Schedules ────────────────────────────────────────────────────────────────

export const schedules = pgTable('schedules', {
  id: uuid('id').defaultRandom().primaryKey(),
  teamId: uuid('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  prompt: text('prompt').notNull(),
  cronExpression: text('cron_expression'),
  workingDirectory: text('working_directory').notNull(),
  model: text('model').notNull().default('claude-sonnet-4-6'),
  permissionMode: text('permission_mode').notNull().default('ask'),
  enabled: boolean('enabled').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ─── Cron Tasks ───────────────────────────────────────────────────────────────

export const cronTasks = pgTable('cron_tasks', {
  id: uuid('id').defaultRandom().primaryKey(),
  scheduleId: uuid('schedule_id').notNull().references(() => schedules.id, { onDelete: 'cascade' }),
  status: text('status').notNull().default('pending'),
  startedAt: timestamp('started_at'),
  finishedAt: timestamp('finished_at'),
  output: text('output'),
  exitCode: integer('exit_code'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ─── Issues ───────────────────────────────────────────────────────────────────

export const issues = pgTable('issues', {
  id: uuid('id').defaultRandom().primaryKey(),
  teamId: uuid('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'set null' }),
  assigneeId: uuid('assignee_id').references(() => users.id, { onDelete: 'set null' }),
  statusId: uuid('status_id').notNull().references(() => issueStatuses.id),
  title: text('title').notNull(),
  description: text('description'),
  priority: issuePriorityEnum('priority').notNull().default('no_priority'),
  estimate: integer('estimate'), // story points
  dueDate: timestamp('due_date'),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ─── Issue Labels (join) ──────────────────────────────────────────────────────

export const issueLabels = pgTable('issue_labels', {
  issueId: uuid('issue_id').notNull().references(() => issues.id, { onDelete: 'cascade' }),
  labelId: uuid('label_id').notNull().references(() => labels.id, { onDelete: 'cascade' }),
});

// ─── Comments ─────────────────────────────────────────────────────────────────

export const comments = pgTable('comments', {
  id: uuid('id').defaultRandom().primaryKey(),
  issueId: uuid('issue_id').notNull().references(() => issues.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ─── Issue History ────────────────────────────────────────────────────────────

export const issueHistory = pgTable('issue_history', {
  id: uuid('id').defaultRandom().primaryKey(),
  issueId: uuid('issue_id').notNull().references(() => issues.id, { onDelete: 'cascade' }),
  field: text('field').notNull(),
  oldValue: text('old_value'),
  newValue: text('new_value'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ─── Roadmaps ─────────────────────────────────────────────────────────────────

export const roadmaps = pgTable('roadmaps', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const roadmapProjects = pgTable('roadmap_projects', {
  roadmapId: uuid('roadmap_id').notNull().references(() => roadmaps.id, { onDelete: 'cascade' }),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
});

// ─── Views ────────────────────────────────────────────────────────────────────

export const views = pgTable('views', {
  id: uuid('id').defaultRandom().primaryKey(),
  teamId: uuid('team_id').references(() => teams.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  filters: text('filters').notNull().default('{}'), // JSON string
  isShared: boolean('is_shared').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ─── Relations ────────────────────────────────────────────────────────────────

export const usersRelations = relations(users, ({ many }) => ({
  teamMembers: many(teamMembers),
}));

export const teamsRelations = relations(teams, ({ many }) => ({
  projects: many(projects),
  issues: many(issues),
  issueStatuses: many(issueStatuses),
  labels: many(labels),
  schedules: many(schedules),
  views: many(views),
  teamMembers: many(teamMembers),
}));

export const teamMembersRelations = relations(teamMembers, ({ one }) => ({
  team: one(teams, { fields: [teamMembers.teamId], references: [teams.id] }),
  user: one(users, { fields: [teamMembers.userId], references: [users.id] }),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  team: one(teams, { fields: [projects.teamId], references: [teams.id] }),
  issues: many(issues),
  roadmapProjects: many(roadmapProjects),
}));

export const issueStatusesRelations = relations(issueStatuses, ({ one, many }) => ({
  team: one(teams, { fields: [issueStatuses.teamId], references: [teams.id] }),
  issues: many(issues),
}));

export const labelsRelations = relations(labels, ({ one, many }) => ({
  team: one(teams, { fields: [labels.teamId], references: [teams.id] }),
  issueLabels: many(issueLabels),
}));

export const schedulesRelations = relations(schedules, ({ one, many }) => ({
  team: one(teams, { fields: [schedules.teamId], references: [teams.id] }),
  cronTasks: many(cronTasks),
}));

export const cronTasksRelations = relations(cronTasks, ({ one }) => ({
  schedule: one(schedules, { fields: [cronTasks.scheduleId], references: [schedules.id] }),
}));

export const issuesRelations = relations(issues, ({ one, many }) => ({
  team: one(teams, { fields: [issues.teamId], references: [teams.id] }),
  project: one(projects, { fields: [issues.projectId], references: [projects.id] }),
  assignee: one(users, { fields: [issues.assigneeId], references: [users.id] }),
  status: one(issueStatuses, { fields: [issues.statusId], references: [issueStatuses.id] }),
  labels: many(issueLabels),
  comments: many(comments),
  history: many(issueHistory),
}));

export const issueLabelsRelations = relations(issueLabels, ({ one }) => ({
  issue: one(issues, { fields: [issueLabels.issueId], references: [issues.id] }),
  label: one(labels, { fields: [issueLabels.labelId], references: [labels.id] }),
}));

export const commentsRelations = relations(comments, ({ one }) => ({
  issue: one(issues, { fields: [comments.issueId], references: [issues.id] }),
}));

export const issueHistoryRelations = relations(issueHistory, ({ one }) => ({
  issue: one(issues, { fields: [issueHistory.issueId], references: [issues.id] }),
}));

export const roadmapsRelations = relations(roadmaps, ({ many }) => ({
  roadmapProjects: many(roadmapProjects),
}));

export const roadmapProjectsRelations = relations(roadmapProjects, ({ one }) => ({
  roadmap: one(roadmaps, { fields: [roadmapProjects.roadmapId], references: [roadmaps.id] }),
  project: one(projects, { fields: [roadmapProjects.projectId], references: [projects.id] }),
}));

export const viewsRelations = relations(views, ({ one }) => ({
  team: one(teams, { fields: [views.teamId], references: [teams.id] }),
}));
