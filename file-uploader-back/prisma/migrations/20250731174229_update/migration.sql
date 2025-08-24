/*
  Warnings:

  - Made the column `previewCount` on table `File` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "File" ALTER COLUMN "previewCount" SET NOT NULL,
ALTER COLUMN "previewCount" SET DEFAULT 0;
