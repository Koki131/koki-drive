/*
  Warnings:

  - A unique constraint covering the columns `[parentId,name,type]` on the table `File` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "File_parentId_name_type_key" ON "File"("parentId", "name", "type");
