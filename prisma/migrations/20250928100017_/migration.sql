CREATE EXTENSION IF NOT EXISTS citext; 
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- CreateEnum
CREATE TYPE "public"."UserStatus" AS ENUM ('pending', 'active', 'rejected', 'suspended');

-- CreateEnum
CREATE TYPE "public"."MemberRole" AS ENUM ('owner', 'admin', 'member', 'guest');

-- CreateEnum
CREATE TYPE "public"."TaskStatus" AS ENUM ('todo', 'in_progress', 'done', 'blocked');

-- CreateEnum
CREATE TYPE "public"."TaskPriority" AS ENUM ('low', 'medium', 'high', 'urgent');

-- CreateEnum
CREATE TYPE "public"."AttendeeResp" AS ENUM ('needsAction', 'accepted', 'declined', 'tentative');

-- CreateEnum
CREATE TYPE "public"."DeptMemberRole" AS ENUM ('manager', 'member');

-- CreateEnum
CREATE TYPE "public"."NotificationType" AS ENUM ('user_signup_pending', 'user_signup_approved', 'user_signup_rejected', 'task_assigned', 'task_commented', 'event_invite', 'event_updated');

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "email" CITEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "passwordHash" TEXT,
    "name" TEXT,
    "avatarUrl" TEXT,
    "status" "public"."UserStatus" NOT NULL DEFAULT 'pending',
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectedReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AccountsOauth" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "expiresAt" TIMESTAMP(3),
    "scope" TEXT,

    CONSTRAINT "AccountsOauth_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserApproval" (
    "id" TEXT NOT NULL,
    "targetUserId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "reason" TEXT,
    "actedById" TEXT NOT NULL,
    "actedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserApproval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Membership" (
    "orgId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "public"."MemberRole" NOT NULL,

    CONSTRAINT "Membership_pkey" PRIMARY KEY ("orgId","userId")
);

-- CreateTable
CREATE TABLE "public"."Department" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "parentId" TEXT,
    "path" TEXT,
    "managerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DepartmentMember" (
    "departmentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "public"."DeptMemberRole" NOT NULL DEFAULT 'member',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DepartmentMember_pkey" PRIMARY KEY ("departmentId","userId")
);

-- CreateTable
CREATE TABLE "public"."Project" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Task" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "projectId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "public"."TaskStatus" NOT NULL DEFAULT 'todo',
    "priority" "public"."TaskPriority",
    "assigneeId" TEXT,
    "dueAt" TIMESTAMP(3),
    "startAt" TIMESTAMP(3),
    "estimateMinutes" INTEGER,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TaskChecklist" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isDone" BOOLEAN NOT NULL DEFAULT false,
    "idx" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "TaskChecklist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TaskComment" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Calendar" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "timeZone" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Calendar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Event" (
    "id" TEXT NOT NULL,
    "calendarId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "location" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "allDay" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."EventAttendee" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT,
    "email" CITEXT,
    "responseStatus" "public"."AttendeeResp",

    CONSTRAINT "EventAttendee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TaskEventLink" (
    "taskId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,

    CONSTRAINT "TaskEventLink_pkey" PRIMARY KEY ("taskId","eventId")
);

-- CreateTable
CREATE TABLE "public"."GoogleCalendar" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "googleCalendarId" TEXT NOT NULL,
    "summary" TEXT,
    "timeZone" TEXT,
    "color" TEXT,
    "syncToken" TEXT,
    "channelId" TEXT,
    "resourceId" TEXT,
    "channelExpireAt" TIMESTAMP(3),
    "lastSyncedAt" TIMESTAMP(3),

    CONSTRAINT "GoogleCalendar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."GoogleEventLink" (
    "eventId" TEXT NOT NULL,
    "googleCalendarIdRef" TEXT NOT NULL,
    "googleEventId" TEXT NOT NULL,
    "googleEtag" TEXT,
    "lastPushedAt" TIMESTAMP(3),
    "lastPulledAt" TIMESTAMP(3),

    CONSTRAINT "GoogleEventLink_pkey" PRIMARY KEY ("eventId","googleCalendarIdRef")
);

-- CreateTable
CREATE TABLE "public"."Notification" (
    "id" TEXT NOT NULL,
    "orgId" TEXT,
    "recipientId" TEXT NOT NULL,
    "type" "public"."NotificationType" NOT NULL,
    "title" TEXT,
    "body" TEXT,
    "data" JSONB,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SyncOutbox" (
    "id" BIGSERIAL NOT NULL,
    "orgId" TEXT,
    "kind" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "dedupeKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "SyncOutbox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SyncLog" (
    "id" BIGSERIAL NOT NULL,
    "source" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "externalId" TEXT,
    "status" TEXT NOT NULL,
    "message" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SyncLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE INDEX "User_status_idx" ON "public"."User"("status");

-- CreateIndex
CREATE UNIQUE INDEX "AccountsOauth_provider_providerAccountId_key" ON "public"."AccountsOauth"("provider", "providerAccountId");

-- CreateIndex
CREATE INDEX "UserApproval_actedAt_idx" ON "public"."UserApproval"("actedAt");

-- CreateIndex
CREATE INDEX "Department_orgId_idx" ON "public"."Department"("orgId");

-- CreateIndex
CREATE INDEX "Department_parentId_idx" ON "public"."Department"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "Department_orgId_name_key" ON "public"."Department"("orgId", "name");

-- CreateIndex
CREATE INDEX "Project_orgId_idx" ON "public"."Project"("orgId");

-- CreateIndex
CREATE INDEX "Task_orgId_projectId_idx" ON "public"."Task"("orgId", "projectId");

-- CreateIndex
CREATE INDEX "Task_orgId_status_dueAt_idx" ON "public"."Task"("orgId", "status", "dueAt");

-- CreateIndex
CREATE INDEX "Task_assigneeId_dueAt_idx" ON "public"."Task"("assigneeId", "dueAt");

-- CreateIndex
CREATE INDEX "TaskChecklist_taskId_isDone_idx" ON "public"."TaskChecklist"("taskId", "isDone");

-- CreateIndex
CREATE INDEX "TaskComment_taskId_createdAt_idx" ON "public"."TaskComment"("taskId", "createdAt");

-- CreateIndex
CREATE INDEX "Calendar_orgId_idx" ON "public"."Calendar"("orgId");

-- CreateIndex
CREATE INDEX "Event_calendarId_startsAt_endsAt_idx" ON "public"."Event"("calendarId", "startsAt", "endsAt");

-- CreateIndex
CREATE INDEX "EventAttendee_eventId_idx" ON "public"."EventAttendee"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "GoogleCalendar_userId_googleCalendarId_key" ON "public"."GoogleCalendar"("userId", "googleCalendarId");

-- CreateIndex
CREATE UNIQUE INDEX "GoogleEventLink_googleCalendarIdRef_googleEventId_key" ON "public"."GoogleEventLink"("googleCalendarIdRef", "googleEventId");

-- CreateIndex
CREATE INDEX "Notification_recipientId_isRead_createdAt_idx" ON "public"."Notification"("recipientId", "isRead", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_orgId_createdAt_idx" ON "public"."Notification"("orgId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SyncOutbox_dedupeKey_key" ON "public"."SyncOutbox"("dedupeKey");

-- CreateIndex
CREATE INDEX "SyncOutbox_kind_idx" ON "public"."SyncOutbox"("kind");

-- CreateIndex
CREATE INDEX "SyncLog_occurredAt_idx" ON "public"."SyncLog"("occurredAt");

-- AddForeignKey
ALTER TABLE "public"."AccountsOauth" ADD CONSTRAINT "AccountsOauth_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserApproval" ADD CONSTRAINT "UserApproval_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserApproval" ADD CONSTRAINT "UserApproval_actedById_fkey" FOREIGN KEY ("actedById") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Membership" ADD CONSTRAINT "Membership_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Membership" ADD CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Department" ADD CONSTRAINT "Department_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Department" ADD CONSTRAINT "Department_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "public"."Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Department" ADD CONSTRAINT "Department_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DepartmentMember" ADD CONSTRAINT "DepartmentMember_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "public"."Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DepartmentMember" ADD CONSTRAINT "DepartmentMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Project" ADD CONSTRAINT "Project_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Project" ADD CONSTRAINT "Project_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Task" ADD CONSTRAINT "Task_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Task" ADD CONSTRAINT "Task_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Task" ADD CONSTRAINT "Task_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Task" ADD CONSTRAINT "Task_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TaskChecklist" ADD CONSTRAINT "TaskChecklist_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "public"."Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TaskComment" ADD CONSTRAINT "TaskComment_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "public"."Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TaskComment" ADD CONSTRAINT "TaskComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Calendar" ADD CONSTRAINT "Calendar_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Calendar" ADD CONSTRAINT "Calendar_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Event" ADD CONSTRAINT "Event_calendarId_fkey" FOREIGN KEY ("calendarId") REFERENCES "public"."Calendar"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Event" ADD CONSTRAINT "Event_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EventAttendee" ADD CONSTRAINT "EventAttendee_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "public"."Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EventAttendee" ADD CONSTRAINT "EventAttendee_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TaskEventLink" ADD CONSTRAINT "TaskEventLink_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "public"."Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TaskEventLink" ADD CONSTRAINT "TaskEventLink_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "public"."Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GoogleCalendar" ADD CONSTRAINT "GoogleCalendar_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GoogleEventLink" ADD CONSTRAINT "GoogleEventLink_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "public"."Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GoogleEventLink" ADD CONSTRAINT "GoogleEventLink_googleCalendarIdRef_fkey" FOREIGN KEY ("googleCalendarIdRef") REFERENCES "public"."GoogleCalendar"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Notification" ADD CONSTRAINT "Notification_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Notification" ADD CONSTRAINT "Notification_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SyncOutbox" ADD CONSTRAINT "SyncOutbox_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
