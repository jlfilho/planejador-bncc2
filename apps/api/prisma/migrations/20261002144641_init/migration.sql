-- CreateEnum
CREATE TYPE "PlanStatus" AS ENUM ('RASCUNHO');

-- CreateEnum
CREATE TYPE "AiRunStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "role" VARCHAR(50) NOT NULL DEFAULT 'DOCENTE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" VARCHAR(255) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_agent" TEXT,
    "ip_address" VARCHAR(45),

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bncc_skills" (
    "id" UUID NOT NULL,
    "codigo" VARCHAR(20) NOT NULL,
    "nivel" VARCHAR(100) NOT NULL,
    "ano" INTEGER,
    "eixo" VARCHAR(150) NOT NULL,
    "descricao" TEXT NOT NULL,
    "explicacao" TEXT,
    "exemplos" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bncc_skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plans" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "titulo" VARCHAR(100) NOT NULL,
    "instrucao" TEXT NOT NULL,
    "duracao" INTEGER NOT NULL,
    "recursos_digitais" BOOLEAN NOT NULL,
    "conteudo_markdown" TEXT NOT NULL,
    "status" "PlanStatus" NOT NULL DEFAULT 'RASCUNHO',
    "ai_assisted" BOOLEAN NOT NULL DEFAULT true,
    "ai_run_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plan_skills" (
    "id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "skill_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plan_skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_runs" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "request_id" UUID NOT NULL,
    "status" "AiRunStatus" NOT NULL DEFAULT 'PENDING',
    "payload_request" JSONB NOT NULL,
    "payload_response" JSONB,
    "error_message" TEXT,
    "duration_ms" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_hash_key" ON "sessions"("token_hash");

-- CreateIndex
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "bncc_skills_codigo_key" ON "bncc_skills"("codigo");

-- CreateIndex
CREATE INDEX "bncc_skills_codigo_idx" ON "bncc_skills"("codigo");

-- CreateIndex
CREATE INDEX "bncc_skills_nivel_ano_idx" ON "bncc_skills"("nivel", "ano");

-- CreateIndex
CREATE UNIQUE INDEX "plans_ai_run_id_key" ON "plans"("ai_run_id");

-- CreateIndex
CREATE INDEX "plans_user_id_idx" ON "plans"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "plan_skills_plan_id_skill_id_key" ON "plan_skills"("plan_id", "skill_id");

-- CreateIndex
CREATE UNIQUE INDEX "ai_runs_request_id_key" ON "ai_runs"("request_id");

-- CreateIndex
CREATE INDEX "ai_runs_user_id_idx" ON "ai_runs"("user_id");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plans" ADD CONSTRAINT "plans_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plans" ADD CONSTRAINT "plans_ai_run_id_fkey" FOREIGN KEY ("ai_run_id") REFERENCES "ai_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_skills" ADD CONSTRAINT "plan_skills_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_skills" ADD CONSTRAINT "plan_skills_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "bncc_skills"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_runs" ADD CONSTRAINT "ai_runs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
