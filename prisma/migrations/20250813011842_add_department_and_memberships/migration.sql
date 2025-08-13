-- CreateEnum
CREATE TYPE "public"."DepartmentRole" AS ENUM ('ADMIN', 'MANAGER', 'MEMBER', 'REQUESTER');

-- AlterTable
ALTER TABLE "public"."processes" ADD COLUMN     "departmentId" TEXT;

-- CreateTable
CREATE TABLE "public"."departments" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "parentId" TEXT,
    "path" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."department_membership" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "role" "public"."DepartmentRole" NOT NULL DEFAULT 'MEMBER',
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "department_membership_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "departments_organizationId_idx" ON "public"."departments"("organizationId");

-- CreateIndex
CREATE INDEX "departments_parentId_idx" ON "public"."departments"("parentId");

-- CreateIndex
CREATE INDEX "departments_path_idx" ON "public"."departments"("path");

-- CreateIndex
CREATE UNIQUE INDEX "departments_organizationId_name_key" ON "public"."departments"("organizationId", "name");

-- CreateIndex
CREATE INDEX "department_membership_departmentId_idx" ON "public"."department_membership"("departmentId");

-- CreateIndex
CREATE INDEX "department_membership_userId_idx" ON "public"."department_membership"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "department_membership_userId_departmentId_key" ON "public"."department_membership"("userId", "departmentId");

-- CreateIndex
CREATE INDEX "processes_departmentId_idx" ON "public"."processes"("departmentId");

-- AddForeignKey
ALTER TABLE "public"."departments" ADD CONSTRAINT "departments_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."departments" ADD CONSTRAINT "departments_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "public"."departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."department_membership" ADD CONSTRAINT "department_membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."department_membership" ADD CONSTRAINT "department_membership_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "public"."departments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."processes" ADD CONSTRAINT "processes_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "public"."departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
