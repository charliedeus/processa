/*
  Warnings:

  - Added the required column `classId` to the `processes` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."processes" ADD COLUMN     "classId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "public"."process_classes" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "parentId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "slaDays" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "process_classes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "process_classes_organizationId_idx" ON "public"."process_classes"("organizationId");

-- CreateIndex
CREATE INDEX "process_classes_parentId_idx" ON "public"."process_classes"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "process_classes_organizationId_code_key" ON "public"."process_classes"("organizationId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "process_classes_organizationId_name_key" ON "public"."process_classes"("organizationId", "name");

-- AddForeignKey
ALTER TABLE "public"."process_classes" ADD CONSTRAINT "process_classes_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."process_classes" ADD CONSTRAINT "process_classes_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "public"."process_classes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."processes" ADD CONSTRAINT "processes_classId_fkey" FOREIGN KEY ("classId") REFERENCES "public"."process_classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
