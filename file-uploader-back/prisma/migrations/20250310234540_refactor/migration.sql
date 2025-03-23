/*
  Warnings:

  - A unique constraint covering the columns `[parentId]` on the table `File` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "File_name_parentId_key";

-- CreateIndex
CREATE UNIQUE INDEX "File_parentId_key" ON "File"("parentId");
