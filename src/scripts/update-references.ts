import { NestFactory } from "@nestjs/core"
import { AppModule } from "../app.module"
import { Model } from "mongoose"
import { Task } from "../database/schemas/Task"
import { TaskLog } from "../database/schemas/TaskLog"
import { TaskComment } from "../database/schemas/TaskComment"
import { Notification } from "../database/schemas/Notification"
import { RefreshSession } from "../auth/refresh-token.schema"
import * as fs from "fs"

/**
 * Script 2: Update references from User._id to Profile._id
 * Run this AFTER migrate-users-to-accounts.ts
 */
async function updateReferences() {
  console.log("🚀 Starting reference update: userId → profileId\n")

  const app = await NestFactory.createApplicationContext(AppModule)

  try {
    // Load mapping
    if (!fs.existsSync("./userId-to-profileId-mapping.json")) {
      throw new Error(
        "❌ Mapping file not found. Run migrate-users-to-accounts.ts first!"
      )
    }

    const mappingData = fs.readFileSync(
      "./userId-to-profileId-mapping.json",
      "utf-8"
    )
    const mapping = JSON.parse(mappingData) as Record<string, string>
    console.log(`📊 Loaded mapping for ${Object.keys(mapping).length} users\n`)

    const taskModel = app.get<Model<Task>>("TaskModel")
    const taskLogModel = app.get<Model<TaskLog>>("TaskLogModel")
    const taskCommentModel = app.get<Model<TaskComment>>("TaskCommentModel")
    const notificationModel = app.get<Model<Notification>>("NotificationModel")
    const refreshSessionModel = app.get<Model<RefreshSession>>(
      "RefreshSessionModel"
    )

    let stats = {
      tasks: { updated: 0, errors: 0 },
      taskLogs: { updated: 0, errors: 0 },
      taskComments: { updated: 0, errors: 0 },
      notifications: { updated: 0, errors: 0 },
      refreshSessions: { updated: 0, errors: 0 }
    }

    // 1. Update Tasks (assignedTo, createdBy)
    console.log("📝 Updating Tasks...")
    for (const [oldUserId, newProfileId] of Object.entries(mapping)) {
      try {
        const result = await taskModel
          .updateMany(
            {
              $or: [{ assignedTo: oldUserId }, { createdBy: oldUserId }]
            },
            {
              $set: {
                assignedTo: newProfileId,
                createdBy: newProfileId
              }
            }
          )
          .exec()
        stats.tasks.updated += result.modifiedCount || 0
      } catch (error) {
        console.error(`❌ Error updating tasks for ${oldUserId}:`, error)
        stats.tasks.errors++
      }
    }
    console.log(
      `   ✅ Updated ${stats.tasks.updated} tasks, ${stats.tasks.errors} errors\n`
    )

    // 2. Update TaskLogs (userId)
    console.log("📝 Updating TaskLogs...")
    for (const [oldUserId, newProfileId] of Object.entries(mapping)) {
      try {
        const result = await taskLogModel
          .updateMany({ userId: oldUserId }, { $set: { userId: newProfileId } })
          .exec()
        stats.taskLogs.updated += result.modifiedCount || 0
      } catch (error) {
        console.error(`❌ Error updating task logs for ${oldUserId}:`, error)
        stats.taskLogs.errors++
      }
    }
    console.log(
      `   ✅ Updated ${stats.taskLogs.updated} task logs, ${stats.taskLogs.errors} errors\n`
    )

    // 3. Update TaskComments (userId)
    console.log("📝 Updating TaskComments...")
    for (const [oldUserId, newProfileId] of Object.entries(mapping)) {
      try {
        const result = await taskCommentModel
          .updateMany({ userId: oldUserId }, { $set: { userId: newProfileId } })
          .exec()
        stats.taskComments.updated += result.modifiedCount || 0
      } catch (error) {
        console.error(
          `❌ Error updating task comments for ${oldUserId}:`,
          error
        )
        stats.taskComments.errors++
      }
    }
    console.log(
      `   ✅ Updated ${stats.taskComments.updated} task comments, ${stats.taskComments.errors} errors\n`
    )

    // 4. Update Notifications (userId)
    console.log("📝 Updating Notifications...")
    for (const [oldUserId, newProfileId] of Object.entries(mapping)) {
      try {
        const result = await notificationModel
          .updateMany({ userId: oldUserId }, { $set: { userId: newProfileId } })
          .exec()
        stats.notifications.updated += result.modifiedCount || 0
      } catch (error) {
        console.error(
          `❌ Error updating notifications for ${oldUserId}:`,
          error
        )
        stats.notifications.errors++
      }
    }
    console.log(
      `   ✅ Updated ${stats.notifications.updated} notifications, ${stats.notifications.errors} errors\n`
    )

    // 5. Update RefreshSessions (userId)
    console.log("📝 Updating RefreshSessions...")
    for (const [oldUserId, newProfileId] of Object.entries(mapping)) {
      try {
        const result = await refreshSessionModel
          .updateMany({ userId: oldUserId }, { $set: { userId: newProfileId } })
          .exec()
        stats.refreshSessions.updated += result.modifiedCount || 0
      } catch (error) {
        console.error(
          `❌ Error updating refresh sessions for ${oldUserId}:`,
          error
        )
        stats.refreshSessions.errors++
      }
    }
    console.log(
      `   ✅ Updated ${stats.refreshSessions.updated} refresh sessions, ${stats.refreshSessions.errors} errors\n`
    )

    // Print summary
    console.log("\n" + "=".repeat(50))
    console.log("📊 Reference Update Summary:")
    console.log(`   Tasks: ${stats.tasks.updated} updated`)
    console.log(`   TaskLogs: ${stats.taskLogs.updated} updated`)
    console.log(`   TaskComments: ${stats.taskComments.updated} updated`)
    console.log(`   Notifications: ${stats.notifications.updated} updated`)
    console.log(`   RefreshSessions: ${stats.refreshSessions.updated} updated`)
    console.log("=".repeat(50) + "\n")

    console.log("✅ All references updated successfully!")
    console.log(
      "⚠️  Note: Old refresh sessions may be invalid. Users may need to login again.\n"
    )
  } catch (error) {
    console.error("❌ Reference update failed:", error)
    throw error
  } finally {
    await app.close()
  }
}

// Run script
updateReferences()
  .then(() => {
    console.log("✅ Reference update completed")
    process.exit(0)
  })
  .catch((error) => {
    console.error("❌ Reference update failed:", error)
    process.exit(1)
  })
