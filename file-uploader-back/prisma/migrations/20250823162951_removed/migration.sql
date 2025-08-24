/*
  Warnings:

  - You are about to drop the column `previewUrl` on the `File` table. All the data in the column will be lost.
  - You are about to drop the column `relativePath` on the `File` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "File" DROP COLUMN "previewUrl",
DROP COLUMN "relativePath";

-- CreateTable
CREATE TABLE "Root" (
    "id" SERIAL NOT NULL,
    "previewCount" INTEGER NOT NULL DEFAULT 0,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "Root_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Root_userId_key" ON "Root"("userId");

-- AddForeignKey
ALTER TABLE "Root" ADD CONSTRAINT "Root_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
