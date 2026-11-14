using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AquaBlend.Api.Migrations
{
    /// <summary>
    /// Synchronizes the EF Core model with the milp_model_input / milp_model_output /
    /// milp_ai_output tables and the new Runs cache/integration columns that already exist in
    /// the live Supabase project (AquaBlend_Backend_Final_Integration_Implementation.md §19).
    ///
    /// A normal generated migration (plain CreateTable/AddColumn/AddForeignKey) would fail
    /// against that already-updated database, because those objects already exist there. Every
    /// statement below is therefore guarded so this migration is safe to run against BOTH:
    ///   - the live Supabase schema (every guarded statement is a no-op there), and
    ///   - a fresh/older-compatible database (every guarded statement actually creates the
    ///     target schema, bringing it to parity with Supabase).
    ///
    /// Column/table shapes here intentionally match what AquaBlendDbContextModelSnapshot.cs
    /// already describes for AquaBlend.Entities.MilpModelInput/MilpModelOutput/MilpAiOutput and
    /// the new AquaBlend.Entities.Run properties, so future `dotnet ef migrations add` calls diff
    /// correctly against this migration's end state.
    /// </summary>
    public partial class AddMilpIntegrationTables : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.EnsureSchema(name: "public");

            AddRunsColumns(migrationBuilder);
            CreateMilpModelInputTable(migrationBuilder);
            CreateMilpModelOutputTable(migrationBuilder);
            CreateMilpAiOutputTable(migrationBuilder);
            CreateIndexes(migrationBuilder);
            AddForeignKeys(migrationBuilder);
        }

        private static void AddRunsColumns(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                ALTER TABLE "Runs" ADD COLUMN IF NOT EXISTS "ForceRerun" boolean NOT NULL DEFAULT FALSE;
                ALTER TABLE "Runs" ADD COLUMN IF NOT EXISTS "MilpCacheHit" boolean NOT NULL DEFAULT FALSE;
                ALTER TABLE "Runs" ADD COLUMN IF NOT EXISTS "AiCacheHit" boolean NOT NULL DEFAULT FALSE;
                ALTER TABLE "Runs" ADD COLUMN IF NOT EXISTS "MilpInputId" uuid NULL;
                ALTER TABLE "Runs" ADD COLUMN IF NOT EXISTS "MilpOutputId" uuid NULL;
                ALTER TABLE "Runs" ADD COLUMN IF NOT EXISTS "AiOutputId" uuid NULL;
                ALTER TABLE "Runs" ADD COLUMN IF NOT EXISTS "ReusedMilpFromRunId" integer NULL;
                ALTER TABLE "Runs" ADD COLUMN IF NOT EXISTS "ReusedAiFromRunId" integer NULL;
                ALTER TABLE "Runs" ADD COLUMN IF NOT EXISTS "MilpStartedAt" timestamp with time zone NULL;
                ALTER TABLE "Runs" ADD COLUMN IF NOT EXISTS "MilpCompletedAt" timestamp with time zone NULL;
                ALTER TABLE "Runs" ADD COLUMN IF NOT EXISTS "AiStartedAt" timestamp with time zone NULL;
                ALTER TABLE "Runs" ADD COLUMN IF NOT EXISTS "AiCompletedAt" timestamp with time zone NULL;
                """);
        }

        private static void CreateMilpModelInputTable(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                CREATE TABLE IF NOT EXISTS public.milp_model_input (
                    id uuid NOT NULL,
                    run_id integer NOT NULL,
                    scenario_id integer NOT NULL,
                    run_external_id text NOT NULL,
                    scenario_external_id text NOT NULL,
                    input_status text NOT NULL DEFAULT 'pending',
                    input_contract_version text NOT NULL DEFAULT '1.0',
                    milp_model_version text NULL,
                    scenario_name text NOT NULL,
                    scenario_status text NOT NULL,
                    data_source_type text NULL,
                    data_source_view text NULL,
                    allow_estimated_values boolean NOT NULL,
                    fail_if_source_missing_from_database boolean NOT NULL,
                    fail_if_daily_availability_missing boolean NOT NULL,
                    fail_if_required_quality_value_missing boolean NOT NULL,
                    fail_if_demand_missing boolean NOT NULL,
                    sources jsonb NOT NULL,
                    plants jsonb NOT NULL,
                    demand_zones jsonb NOT NULL,
                    source_to_plant_links jsonb NOT NULL,
                    plant_to_zone_links jsonb NOT NULL,
                    quality_limits jsonb NOT NULL,
                    validation_policy jsonb NOT NULL,
                    frontend_input_json jsonb NOT NULL,
                    canonical_input_json jsonb NOT NULL,
                    source_data_snapshot_json jsonb NOT NULL,
                    scenario_data_json jsonb NULL,
                    model_parameters_json jsonb NULL,
                    solver_config_json jsonb NOT NULL,
                    canonical_input_hash text NULL,
                    scenario_data_hash text NULL,
                    model_parameters_hash text NULL,
                    input_hash text NULL,
                    solver_config_hash text NULL,
                    execution_key text NULL,
                    scenario_data_schema_version text NOT NULL DEFAULT '1.0',
                    model_parameters_schema_version text NOT NULL DEFAULT '1.0',
                    created_at timestamp with time zone NOT NULL,
                    resolved_at timestamp with time zone NULL,
                    CONSTRAINT "PK_milp_model_input" PRIMARY KEY (id)
                );
                """);
        }

        private static void CreateMilpModelOutputTable(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                CREATE TABLE IF NOT EXISTS public.milp_model_output (
                    id uuid NOT NULL,
                    origin_run_id integer NULL,
                    input_id uuid NULL,
                    scenario_db_id integer NULL,
                    schema_version text NULL,
                    scenario_id text NULL,
                    scenario_status text NULL,
                    execution_key text NULL,
                    input_hash text NULL,
                    model_parameters_hash text NULL,
                    milp_model_version text NULL,
                    solver_name text NULL,
                    solver_version text NULL,
                    solver_config_hash text NULL,
                    solver_termination_condition text NULL,
                    solver_message text NULL,
                    solve_time_ms double precision NULL,
                    raw_output_json jsonb NOT NULL,
                    output_hash text NULL,
                    cache_reusable boolean NOT NULL DEFAULT TRUE,
                    forced_recompute boolean NOT NULL DEFAULT FALSE,
                    started_at timestamp with time zone NULL,
                    completed_at timestamp with time zone NULL,
                    updated_at timestamp with time zone NULL,
                    created_at timestamp with time zone NOT NULL,
                    loader_status text NULL,
                    loader_scenario_ready boolean NULL,
                    loader_validation_issues jsonb NULL,
                    loader_checks jsonb NULL,
                    preprocessing_status text NULL,
                    preprocessing_warnings jsonb NULL,
                    preprocessing_checks jsonb NULL,
                    output_consistency_status text NULL,
                    output_consistency_tolerance double precision NULL,
                    output_consistency_checks jsonb NULL,
                    solver_status text NULL,
                    solver_is_feasible boolean NULL,
                    solver_is_optimal boolean NULL,
                    solver_objective_value double precision NULL,
                    total_demand_ml_per_day double precision NULL,
                    total_withdrawal_ml_per_day double precision NULL,
                    total_treated_ml_per_day double precision NULL,
                    total_delivered_ml_per_day double precision NULL,
                    selected_source_count integer NULL,
                    active_plant_count integer NULL,
                    total_source_fixed_cost double precision NULL,
                    total_source_variable_cost double precision NULL,
                    total_plant_fixed_cost double precision NULL,
                    total_plant_variable_cost double precision NULL,
                    reconstructed_total_cost double precision NULL,
                    total_cost double precision NULL,
                    cost_reconciles boolean NULL,
                    sources jsonb NULL,
                    plants jsonb NULL,
                    demand_zones jsonb NULL,
                    flows_source_to_plant jsonb NULL,
                    flows_plant_to_zone jsonb NULL,
                    quality jsonb NULL,
                    binding_constraints_summary jsonb NULL,
                    warnings jsonb NULL,
                    CONSTRAINT "PK_milp_model_output" PRIMARY KEY (id)
                );
                """);
        }

        private static void CreateMilpAiOutputTable(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                CREATE TABLE IF NOT EXISTS public.milp_ai_output (
                    id uuid NOT NULL,
                    origin_run_id integer NULL,
                    milp_output_id uuid NOT NULL,
                    scenario_id integer NOT NULL,
                    status text NOT NULL DEFAULT 'pending',
                    ai_provider text NULL,
                    ai_model text NULL,
                    ai_model_version text NULL,
                    prompt_version text NULL,
                    analysis_version text NULL,
                    ai_contract_version text NOT NULL DEFAULT '1.0',
                    milp_output_hash text NULL,
                    ai_cache_key text NULL,
                    ai_input_json jsonb NOT NULL,
                    executive_summary text NULL,
                    decision_explanation text NULL,
                    key_findings jsonb NULL,
                    anomalies jsonb NULL,
                    recommendations jsonb NULL,
                    warnings jsonb NULL,
                    risk_assessment jsonb NULL,
                    source_analysis jsonb NULL,
                    plant_analysis jsonb NULL,
                    quality_analysis jsonb NULL,
                    limitations jsonb NULL,
                    raw_ai_json jsonb NULL,
                    ai_output_hash text NULL,
                    cache_reusable boolean NOT NULL DEFAULT TRUE,
                    forced_recompute boolean NOT NULL DEFAULT FALSE,
                    latency_ms double precision NULL,
                    prompt_tokens integer NULL,
                    completion_tokens integer NULL,
                    total_tokens integer NULL,
                    error_code text NULL,
                    error_message text NULL,
                    created_at timestamp with time zone NOT NULL,
                    started_at timestamp with time zone NULL,
                    completed_at timestamp with time zone NULL,
                    updated_at timestamp with time zone NULL,
                    CONSTRAINT "PK_milp_ai_output" PRIMARY KEY (id)
                );
                """);
        }

        private static void CreateIndexes(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                CREATE UNIQUE INDEX IF NOT EXISTS "IX_milp_model_input_run_id" ON public.milp_model_input (run_id);
                CREATE INDEX IF NOT EXISTS "IX_milp_model_input_scenario_id" ON public.milp_model_input (scenario_id);

                CREATE INDEX IF NOT EXISTS "IX_milp_model_output_origin_run_id" ON public.milp_model_output (origin_run_id);
                CREATE INDEX IF NOT EXISTS "IX_milp_model_output_input_id" ON public.milp_model_output (input_id);
                CREATE INDEX IF NOT EXISTS "IX_milp_model_output_scenario_db_id" ON public.milp_model_output (scenario_db_id);

                CREATE INDEX IF NOT EXISTS "IX_milp_ai_output_origin_run_id" ON public.milp_ai_output (origin_run_id);
                CREATE INDEX IF NOT EXISTS "IX_milp_ai_output_milp_output_id" ON public.milp_ai_output (milp_output_id);
                CREATE INDEX IF NOT EXISTS "IX_milp_ai_output_scenario_id" ON public.milp_ai_output (scenario_id);

                CREATE INDEX IF NOT EXISTS "IX_Runs_MilpInputId" ON "Runs" ("MilpInputId");
                CREATE INDEX IF NOT EXISTS "IX_Runs_MilpOutputId" ON "Runs" ("MilpOutputId");
                CREATE INDEX IF NOT EXISTS "IX_Runs_AiOutputId" ON "Runs" ("AiOutputId");
                CREATE INDEX IF NOT EXISTS "IX_Runs_ReusedMilpFromRunId" ON "Runs" ("ReusedMilpFromRunId");
                CREATE INDEX IF NOT EXISTS "IX_Runs_ReusedAiFromRunId" ON "Runs" ("ReusedAiFromRunId");
                """);
        }

        /// <summary>
        /// Postgres has no `ADD CONSTRAINT IF NOT EXISTS`, so every FK is guarded by checking
        /// pg_constraint first (AquaBlend_Backend_Final_Integration_Implementation.md §19).
        /// DeleteBehavior.Restrict everywhere — see Data/AquaBlendDbContext.cs's
        /// ConfigureMilpIntegrationTables for why (the schema has FK references in both
        /// directions between Runs and each integration table; Restrict on every one of them is
        /// what keeps that from becoming a cascade-delete cycle).
        /// </summary>
        private static void AddForeignKeys(MigrationBuilder migrationBuilder)
        {
            AddForeignKeyIfNotExists(migrationBuilder,
                "FK_milp_model_input_Runs_run_id", "public.milp_model_input", "run_id",
                "\"Runs\"", "\"Id\"");

            AddForeignKeyIfNotExists(migrationBuilder,
                "FK_milp_model_input_Scenarios_scenario_id", "public.milp_model_input", "scenario_id",
                "\"Scenarios\"", "\"Id\"");

            AddForeignKeyIfNotExists(migrationBuilder,
                "FK_milp_model_output_Runs_origin_run_id", "public.milp_model_output", "origin_run_id",
                "\"Runs\"", "\"Id\"");

            AddForeignKeyIfNotExists(migrationBuilder,
                "FK_milp_model_output_Scenarios_scenario_db_id", "public.milp_model_output", "scenario_db_id",
                "\"Scenarios\"", "\"Id\"");

            AddForeignKeyIfNotExists(migrationBuilder,
                "FK_milp_model_output_milp_model_input_input_id", "public.milp_model_output", "input_id",
                "public.milp_model_input", "id");

            AddForeignKeyIfNotExists(migrationBuilder,
                "FK_milp_ai_output_Runs_origin_run_id", "public.milp_ai_output", "origin_run_id",
                "\"Runs\"", "\"Id\"");

            AddForeignKeyIfNotExists(migrationBuilder,
                "FK_milp_ai_output_Scenarios_scenario_id", "public.milp_ai_output", "scenario_id",
                "\"Scenarios\"", "\"Id\"");

            AddForeignKeyIfNotExists(migrationBuilder,
                "FK_milp_ai_output_milp_model_output_milp_output_id", "public.milp_ai_output", "milp_output_id",
                "public.milp_model_output", "id");

            AddForeignKeyIfNotExists(migrationBuilder,
                "FK_Runs_Runs_ReusedMilpFromRunId", "\"Runs\"", "\"ReusedMilpFromRunId\"",
                "\"Runs\"", "\"Id\"");

            AddForeignKeyIfNotExists(migrationBuilder,
                "FK_Runs_Runs_ReusedAiFromRunId", "\"Runs\"", "\"ReusedAiFromRunId\"",
                "\"Runs\"", "\"Id\"");

            AddForeignKeyIfNotExists(migrationBuilder,
                "FK_Runs_milp_model_input_MilpInputId", "\"Runs\"", "\"MilpInputId\"",
                "public.milp_model_input", "id");

            AddForeignKeyIfNotExists(migrationBuilder,
                "FK_Runs_milp_model_output_MilpOutputId", "\"Runs\"", "\"MilpOutputId\"",
                "public.milp_model_output", "id");

            AddForeignKeyIfNotExists(migrationBuilder,
                "FK_Runs_milp_ai_output_AiOutputId", "\"Runs\"", "\"AiOutputId\"",
                "public.milp_ai_output", "id");
        }

        private static void AddForeignKeyIfNotExists(
            MigrationBuilder migrationBuilder,
            string constraintName,
            string table,
            string column,
            string principalTable,
            string principalColumn)
        {
            migrationBuilder.Sql(
                $"""
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM pg_constraint WHERE conname = '{constraintName}'
                    ) THEN
                        ALTER TABLE {table}
                            ADD CONSTRAINT "{constraintName}"
                            FOREIGN KEY ({column}) REFERENCES {principalTable} ({principalColumn})
                            ON DELETE RESTRICT;
                    END IF;
                END $$;
                """);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                ALTER TABLE "Runs" DROP CONSTRAINT IF EXISTS "FK_Runs_Runs_ReusedAiFromRunId";
                ALTER TABLE "Runs" DROP CONSTRAINT IF EXISTS "FK_Runs_Runs_ReusedMilpFromRunId";
                ALTER TABLE "Runs" DROP CONSTRAINT IF EXISTS "FK_Runs_milp_ai_output_AiOutputId";
                ALTER TABLE "Runs" DROP CONSTRAINT IF EXISTS "FK_Runs_milp_model_input_MilpInputId";
                ALTER TABLE "Runs" DROP CONSTRAINT IF EXISTS "FK_Runs_milp_model_output_MilpOutputId";

                DROP TABLE IF EXISTS public.milp_ai_output;
                DROP TABLE IF EXISTS public.milp_model_output;
                DROP TABLE IF EXISTS public.milp_model_input;

                DROP INDEX IF EXISTS "IX_Runs_AiOutputId";
                DROP INDEX IF EXISTS "IX_Runs_MilpInputId";
                DROP INDEX IF EXISTS "IX_Runs_MilpOutputId";
                DROP INDEX IF EXISTS "IX_Runs_ReusedAiFromRunId";
                DROP INDEX IF EXISTS "IX_Runs_ReusedMilpFromRunId";

                ALTER TABLE "Runs" DROP COLUMN IF EXISTS "AiCacheHit";
                ALTER TABLE "Runs" DROP COLUMN IF EXISTS "AiCompletedAt";
                ALTER TABLE "Runs" DROP COLUMN IF EXISTS "AiOutputId";
                ALTER TABLE "Runs" DROP COLUMN IF EXISTS "AiStartedAt";
                ALTER TABLE "Runs" DROP COLUMN IF EXISTS "ForceRerun";
                ALTER TABLE "Runs" DROP COLUMN IF EXISTS "MilpCacheHit";
                ALTER TABLE "Runs" DROP COLUMN IF EXISTS "MilpCompletedAt";
                ALTER TABLE "Runs" DROP COLUMN IF EXISTS "MilpInputId";
                ALTER TABLE "Runs" DROP COLUMN IF EXISTS "MilpOutputId";
                ALTER TABLE "Runs" DROP COLUMN IF EXISTS "MilpStartedAt";
                ALTER TABLE "Runs" DROP COLUMN IF EXISTS "ReusedAiFromRunId";
                ALTER TABLE "Runs" DROP COLUMN IF EXISTS "ReusedMilpFromRunId";
                """);
        }
    }
}
