/*
  Warnings:

  - You are about to drop the column `stops` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "stops";

-- AlterTable
ALTER TABLE "VanRoute" ADD COLUMN     "stops" JSONB;
