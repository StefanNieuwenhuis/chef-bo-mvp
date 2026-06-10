-- CreateEnum
CREATE TYPE "AgentStatus" AS ENUM ('PENDING', 'ACTIVE', 'FAILED');

-- CreateTable
CREATE TABLE "personal_agents" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "household_member_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "status" "AgentStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6),

    CONSTRAINT "personal_agents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "personal_agents_household_member_id_idx" ON "personal_agents"("household_member_id");

-- AddForeignKey
ALTER TABLE "personal_agents" ADD CONSTRAINT "personal_agents_household_member_id_fkey" FOREIGN KEY ("household_member_id") REFERENCES "household_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
