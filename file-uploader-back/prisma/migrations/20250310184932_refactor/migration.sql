/*
  Warnings:

  - A unique constraint covering the columns `[name,parentId]` on the table `File` will be added. If there are existing duplicate values, this will fail.
  - Made the column `userId` on table `File` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "File" DROP CONSTRAINT "File_parentId_fkey";

-- DropForeignKey
ALTER TABLE "File" DROP CONSTRAINT "File_userId_fkey";

-- DropIndex
DROP INDEX "File_name_key";

-- AlterTable
ALTER TABLE "File" ALTER COLUMN "userId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "File_path_idx" ON "File"("path");

-- CreateIndex
CREATE UNIQUE INDEX "File_name_parentId_key" ON "File"("name", "parentId");

-- AddForeignKey
ALTER TABLE "File" ADD CONSTRAINT "File_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "File"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "File" ADD CONSTRAINT "File_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
