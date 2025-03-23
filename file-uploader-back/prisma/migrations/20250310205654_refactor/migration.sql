/*
  Warnings:

  - You are about to drop the column `path` on the `File` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "File_path_idx";

-- AlterTable
ALTER TABLE "File" DROP COLUMN "path";

-- CreateIndex
CREATE INDEX "File_parentId_idx" ON "File"("parentId");
