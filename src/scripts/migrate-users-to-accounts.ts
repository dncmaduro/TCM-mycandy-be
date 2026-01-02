import { NestFactory } from "@nestjs/core"
import { AppModule } from "../app.module"
import { Model } from "mongoose"
import { User } from "../database/schemas/User"
import { Account } from "../database/schemas/Account"
import { Profile } from "../database/schemas/Profile"
import { RoleUser } from "../database/schemas/RoleUser"
import * as bcrypt from "bcrypt"

/**
 * Migration script: User (Google OAuth) → Account + Profile
 *
 * Chuyển đổi từ:
 * - User (googleSub, email, OAuth tokens)
 *
 * Sang:
 * - Account (email, password)
 * - Profile (user info, status)
 */
async function migrateUsersToAccounts() {
  console.log("🚀 Starting migration: User → Account + Profile\n")

  const app = await NestFactory.createApplicationContext(AppModule)

  try {
    const userModel = app.get<Model<User>>("UserModel")
    const accountModel = app.get<Model<Account>>("AccountModel")
    const profileModel = app.get<Model<Profile>>("ProfileModel")
    const roleUserModel = app.get<Model<RoleUser>>("RoleUserModel")

    // Lấy tất cả users
    const users = await userModel.find({}).exec()
    console.log(`📊 Found ${users.length} users to migrate\n`)

    // Map old userId → new profileId để update references sau
    const userIdToProfileIdMap = new Map<string, string>()

    let successCount = 0
    let errorCount = 0

    for (const user of users) {
      try {
        // Check if already migrated
        const existingAccount = await accountModel
          .findOne({ email: user.email })
          .exec()

        if (existingAccount) {
          console.log(`⏭️  Skipping ${user.email} - already migrated`)
          const existingProfile = await profileModel
            .findOne({ accountId: existingAccount._id })
            .exec()
          if (existingProfile) {
            userIdToProfileIdMap.set(
              user._id.toString(),
              existingProfile._id.toString()
            )
          }
          continue
        }

        // Generate temporary password (user must reset)
        const tempPassword = `temp_${Math.random().toString(36).substring(7)}`
        const passwordHash = await bcrypt.hash(tempPassword, 10)

        // Create Account
        const account = await accountModel.create({
          email: user.email,
          passwordHash,
          isVerified: user.status === "active", // Verified nếu đã active
          verificationToken: null,
          resetPasswordToken: null,
          lastLoginAt: null
        })

        console.log(`✅ Created account: ${user.email}`)

        // Create Profile
        const profile = await profileModel.create({
          accountId: account._id,
          name: user.name,
          avatarUrl: user.avatarUrl,
          status: user.status,
          approvedBy: user.approvedBy,
          approvedAt: user.approvedAt,
          rejectedReason: user.rejectedReason,
          consentCalendar: user.consentCalendar
        })

        console.log(`✅ Created profile: ${profile._id}`)

        // Link profile to account
        account.profileId = profile._id as any
        await account.save()

        // Store mapping
        userIdToProfileIdMap.set(user._id.toString(), profile._id.toString())

        // Update RoleUser reference
        await roleUserModel
          .updateMany(
            { userId: user._id.toString() },
            { userId: profile._id.toString() }
          )
          .exec()

        console.log(`✅ Migrated: ${user.email} → Profile ${profile._id}\n`)
        console.log(`   Temp password: ${tempPassword}\n`)

        successCount++
      } catch (error) {
        console.error(`❌ Error migrating ${user.email}:`, error)
        errorCount++
      }
    }

    console.log("\n" + "=".repeat(50))
    console.log(`📊 Migration Summary:`)
    console.log(`   ✅ Success: ${successCount}`)
    console.log(`   ❌ Errors: ${errorCount}`)
    console.log(`   📝 Total: ${users.length}`)
    console.log("=".repeat(50) + "\n")

    // Save mapping to file for reference
    const fs = require("fs")
    const mappingJson = JSON.stringify(
      Object.fromEntries(userIdToProfileIdMap),
      null,
      2
    )
    fs.writeFileSync("./userId-to-profileId-mapping.json", mappingJson, "utf-8")
    console.log("💾 Mapping saved to: userId-to-profileId-mapping.json")

    console.log("\n⚠️  IMPORTANT NOTES:")
    console.log("1. All users have temporary passwords (printed above)")
    console.log("2. Users must reset password on first login")
    console.log("3. RoleUser references updated to use profileId")
    console.log(
      "4. Next: Update Task, TaskLog, TaskComment, Notification schemas"
    )
    console.log("5. Next: Update RefreshSession to use profileId\n")
  } catch (error) {
    console.error("❌ Migration failed:", error)
    throw error
  } finally {
    await app.close()
  }
}

// Run migration
migrateUsersToAccounts()
  .then(() => {
    console.log("✅ Migration completed successfully")
    process.exit(0)
  })
  .catch((error) => {
    console.error("❌ Migration failed:", error)
    process.exit(1)
  })
