/*
  Warnings:

  - Added the required column `chunkEnd` to the `File` table without a default value. This is not possible if the table is not empty.
  - Added the required column `chunkStart` to the `File` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "File" ADD COLUMN     "chunkEnd" TEXT NOT NULL,
ADD COLUMN     "chunkStart" TEXT NOT NULL;
