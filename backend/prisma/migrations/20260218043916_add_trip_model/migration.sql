/*
  Warnings:

  - You are about to drop the column `routeId` on the `Booking` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[userId,tripId]` on the table `Booking` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `tripId` to the `Booking` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "TripStatus" AS ENUM ('OPEN', 'FULL', 'COMPLETED');

-- DropForeignKey
ALTER TABLE "Booking" DROP CONSTRAINT "Booking_routeId_fkey";

-- DropIndex
DROP INDEX "Booking_routeId_idx";

-- DropIndex
DROP INDEX "Booking_userId_routeId_key";

-- AlterTable
ALTER TABLE "Booking" DROP COLUMN "routeId",
ADD COLUMN     "tripId" INTEGER NOT NULL;

-- CreateTable
CREATE TABLE "Trip" (
    "id" SERIAL NOT NULL,
    "routeId" INTEGER NOT NULL,
    "driverId" INTEGER NOT NULL,
    "scheduledTime" TIMESTAMP(3) NOT NULL,
    "status" "TripStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Trip_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Trip_routeId_scheduledTime_idx" ON "Trip"("routeId", "scheduledTime");

-- CreateIndex
CREATE INDEX "Trip_driverId_scheduledTime_idx" ON "Trip"("driverId", "scheduledTime");

-- CreateIndex
CREATE INDEX "Booking_tripId_idx" ON "Booking"("tripId");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_userId_tripId_key" ON "Booking"("userId", "tripId");

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "Route"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
