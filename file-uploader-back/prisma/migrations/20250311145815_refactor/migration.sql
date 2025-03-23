-- DropIndex
DROP INDEX "File_parentId_idx";

-- CreateIndex
CREATE INDEX "File_parentId_name_idx" ON "File"("parentId", "name");
