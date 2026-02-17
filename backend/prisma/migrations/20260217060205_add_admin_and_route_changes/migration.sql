-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'ADMIN';

-- AlterTable
ALTER TABLE "Route" ALTER COLUMN "driverId" DROP NOT NULL;
