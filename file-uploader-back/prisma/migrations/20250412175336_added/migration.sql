/*
  Warnings:

  - Changed the type of `chunkEnd` on the `File` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `chunkStart` on the `File` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "File" DROP COLUMN "chunkEnd",
ADD COLUMN     "chunkEnd" BIGINT NOT NULL,
DROP COLUMN "chunkStart",
ADD COLUMN     "chunkStart" BIGINT NOT NULL;
