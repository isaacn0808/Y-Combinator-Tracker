/*
  Warnings:

  - You are about to drop the column `background` on the `Founder` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `Founder` table. All the data in the column will be lost.
  - You are about to drop the column `linkedIn` on the `Founder` table. All the data in the column will be lost.
  - You are about to drop the column `role` on the `Founder` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Founder` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Founder" DROP COLUMN "background",
DROP COLUMN "createdAt",
DROP COLUMN "linkedIn",
DROP COLUMN "role",
DROP COLUMN "updatedAt",
ADD COLUMN     "bio" TEXT,
ADD COLUMN     "linkedin" TEXT,
ADD COLUMN     "title" TEXT;
