/*
  Warnings:

  - A unique constraint covering the columns `[organizationId,code]` on the table `departments` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `code` to the `departments` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."departments" ADD COLUMN     "code" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "departments_organizationId_code_key" ON "public"."departments"("organizationId", "code");
