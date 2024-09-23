/*
  Warnings:

  - You are about to drop the `_ScheduleToUser` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropIndex
DROP INDEX "_ScheduleToUser_B_index";

-- DropIndex
DROP INDEX "_ScheduleToUser_AB_unique";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "_ScheduleToUser";
PRAGMA foreign_keys=on;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "idTg" INTEGER NOT NULL,
    "scheduleId" INTEGER,
    CONSTRAINT "User_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "Schedule" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_User" ("id", "idTg") SELECT "id", "idTg" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_idTg_key" ON "User"("idTg");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
