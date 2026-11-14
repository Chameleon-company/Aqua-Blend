using Microsoft.EntityFrameworkCore;
using AquaBlend.Entities;

namespace AquaBlend.Data;

public class AquaBlendDbContext : DbContext
{
    public AquaBlendDbContext(DbContextOptions<AquaBlendDbContext> options) : base(options)
    {
    }

    public DbSet<WaterSource> WaterSources => Set<WaterSource>();
    public DbSet<Plant> Plants => Set<Plant>();
    public DbSet<DemandZone> DemandZones => Set<DemandZone>();
    public DbSet<SourcePlantLink> SourcePlantLinks => Set<SourcePlantLink>();
    public DbSet<PlantZoneLink> PlantZoneLinks => Set<PlantZoneLink>();
    public DbSet<QualityProfile> QualityProfiles => Set<QualityProfile>();
    public DbSet<QualityParameter> QualityParameters => Set<QualityParameter>();
    public DbSet<Scenario> Scenarios => Set<Scenario>();
    public DbSet<Run> Runs => Set<Run>();
    public DbSet<OptimisationResult> OptimisationResults => Set<OptimisationResult>();

    // New integration tables (AquaBlend_Backend_Final_Integration_Implementation.md §3) — already
    // live in Supabase as snake_case tables; see OnModelCreating for the explicit column mapping.
    public DbSet<MilpModelInput> MilpModelInputs => Set<MilpModelInput>();
    public DbSet<MilpModelOutput> MilpModelOutputs => Set<MilpModelOutput>();
    public DbSet<MilpAiOutput> MilpAiOutputs => Set<MilpAiOutput>();

    public override int SaveChanges()
    {
        ApplyTimestamps();
        return base.SaveChanges();
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        ApplyTimestamps();
        return base.SaveChangesAsync(cancellationToken);
    }

    private void ApplyTimestamps()
    {
        var currentTime = DateTime.UtcNow;

        foreach (var entry in ChangeTracker.Entries())
        {
            if (entry.State == EntityState.Added)
            {
                if (entry.Metadata.FindProperty("CreatedAt") is not null)
                {
                    entry.Property("CreatedAt").CurrentValue = currentTime;
                }

                if (entry.Metadata.FindProperty("UpdatedAt") is not null)
                {
                    entry.Property("UpdatedAt").CurrentValue = currentTime;
                }
            }

            if (entry.State == EntityState.Modified &&
                entry.Metadata.FindProperty("UpdatedAt") is not null)
            {
                entry.Property("UpdatedAt").CurrentValue = currentTime;
            }
        }
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<OptimisationResult>()
            .Property(r => r.ResultJson)
            .HasColumnType("jsonb");

        modelBuilder.Entity<OptimisationResult>()
            .Property(r => r.TotalCost)
            .HasColumnType("numeric(18,2)");

        modelBuilder.Entity<OptimisationResult>()
            .HasIndex(r => r.ScenarioId);

        modelBuilder.Entity<OptimisationResult>()
            .HasIndex(r => r.RunId)
            .IsUnique();

        modelBuilder.Entity<OptimisationResult>()
            .HasIndex(r => r.Status);

        modelBuilder.Entity<OptimisationResult>()
            .HasIndex(r => r.SolvedAt);

        modelBuilder.Entity<OptimisationResult>()
            .HasOne(r => r.Scenario)
            .WithMany(s => s.OptimisationResults)
            .HasForeignKey(r => r.ScenarioId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<OptimisationResult>()
            .HasOne(r => r.Run)
            .WithMany(r => r.OptimisationResults)
            .HasForeignKey(r => r.RunId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Scenario>()
            .HasIndex(s => s.ExternalId)
            .IsUnique();

        modelBuilder.Entity<Scenario>()
            .Property(s => s.FormStateJson)
            .HasColumnType("jsonb");

        modelBuilder.Entity<Scenario>()
            .Property(s => s.ValidationIssuesJson)
            .HasColumnType("jsonb");

        modelBuilder.Entity<Run>()
            .HasIndex(r => r.ExternalId)
            .IsUnique();

        modelBuilder.Entity<Run>()
            .HasIndex(r => r.ScenarioId);

        modelBuilder.Entity<Run>()
            .Property(r => r.ObjectiveValue)
            .HasColumnType("numeric(18,2)");

        modelBuilder.Entity<Run>()
            .HasOne(r => r.Scenario)
            .WithMany(s => s.Runs)
            .HasForeignKey(r => r.ScenarioId)
            .OnDelete(DeleteBehavior.Restrict);

        ConfigureMilpIntegrationTables(modelBuilder);

        modelBuilder.Entity<WaterSource>()
            .HasIndex(s => s.ExternalId)
            .IsUnique();

        modelBuilder.Entity<WaterSource>()
            .Property(s => s.CostPerMl)
            .HasColumnType("numeric(18,2)");

        modelBuilder.Entity<Plant>()
            .HasIndex(p => p.ExternalId)
            .IsUnique();

        modelBuilder.Entity<Plant>()
            .Property(p => p.FixedActivationCost)
            .HasColumnType("numeric(18,2)");

        modelBuilder.Entity<Plant>()
            .Property(p => p.TreatmentCostPerMlPerDay)
            .HasColumnType("numeric(18,2)");

        modelBuilder.Entity<DemandZone>()
            .HasIndex(z => z.ExternalId)
            .IsUnique();

        modelBuilder.Entity<QualityProfile>()
            .HasIndex(q => q.ExternalId)
            .IsUnique();

        modelBuilder.Entity<QualityParameter>()
            .HasOne(p => p.QualityProfile)
            .WithMany(q => q.Parameters)
            .HasForeignKey(p => p.QualityProfileId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<SourcePlantLink>()
            .HasIndex(l => l.ExternalId)
            .IsUnique();

        modelBuilder.Entity<SourcePlantLink>()
            .HasIndex(l => new { l.SourceId, l.PlantId })
            .IsUnique();

        modelBuilder.Entity<SourcePlantLink>()
            .HasOne(l => l.Source)
            .WithMany(s => s.SourcePlantLinks)
            .HasForeignKey(l => l.SourceId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<SourcePlantLink>()
            .HasOne(l => l.Plant)
            .WithMany(p => p.SourcePlantLinks)
            .HasForeignKey(l => l.PlantId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<PlantZoneLink>()
            .HasIndex(l => l.ExternalId)
            .IsUnique();

        modelBuilder.Entity<PlantZoneLink>()
            .HasIndex(l => new { l.PlantId, l.ZoneId })
            .IsUnique();

        modelBuilder.Entity<PlantZoneLink>()
            .HasOne(l => l.Plant)
            .WithMany(p => p.PlantZoneLinks)
            .HasForeignKey(l => l.PlantId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<PlantZoneLink>()
            .HasOne(l => l.Zone)
            .WithMany(z => z.PlantZoneLinks)
            .HasForeignKey(l => l.ZoneId)
            .OnDelete(DeleteBehavior.Restrict);
    }

    /// <summary>
    /// Explicit table/column mapping for the three snake_case integration tables that already
    /// exist in the live Supabase project (AquaBlend_Backend_Final_Integration_Implementation.md
    /// §9-11) — EF naming conventions are never relied on here because every other
    /// application table in this DbContext uses PascalCase columns.
    ///
    /// The schema intentionally has FK references in both directions (e.g. Runs.MilpInputId and
    /// milp_model_input.run_id both point at "the other row"). Each direction is configured as
    /// its own independent, unidirectional relationship with DeleteBehavior.Restrict, so neither
    /// side ever forms a cascade-delete cycle.
    /// </summary>
    private static void ConfigureMilpIntegrationTables(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<MilpModelInput>(entity =>
        {
            entity.ToTable("milp_model_input", "public");
            entity.HasKey(x => x.Id);

            entity.Property(x => x.Id).HasColumnName("id");
            entity.Property(x => x.RunId).HasColumnName("run_id");
            entity.Property(x => x.ScenarioId).HasColumnName("scenario_id");
            entity.Property(x => x.RunExternalId).HasColumnName("run_external_id");
            entity.Property(x => x.ScenarioExternalId).HasColumnName("scenario_external_id");

            entity.Property(x => x.InputStatus).HasColumnName("input_status");
            entity.Property(x => x.InputContractVersion).HasColumnName("input_contract_version");
            entity.Property(x => x.MilpModelVersion).HasColumnName("milp_model_version");

            entity.Property(x => x.ScenarioName).HasColumnName("scenario_name");
            entity.Property(x => x.ScenarioStatus).HasColumnName("scenario_status");

            entity.Property(x => x.DataSourceType).HasColumnName("data_source_type");
            entity.Property(x => x.DataSourceView).HasColumnName("data_source_view");
            entity.Property(x => x.AllowEstimatedValues).HasColumnName("allow_estimated_values");

            entity.Property(x => x.FailIfSourceMissingFromDatabase).HasColumnName("fail_if_source_missing_from_database");
            entity.Property(x => x.FailIfDailyAvailabilityMissing).HasColumnName("fail_if_daily_availability_missing");
            entity.Property(x => x.FailIfRequiredQualityValueMissing).HasColumnName("fail_if_required_quality_value_missing");
            entity.Property(x => x.FailIfDemandMissing).HasColumnName("fail_if_demand_missing");

            entity.Property(x => x.Sources).HasColumnName("sources").HasColumnType("jsonb");
            entity.Property(x => x.Plants).HasColumnName("plants").HasColumnType("jsonb");
            entity.Property(x => x.DemandZones).HasColumnName("demand_zones").HasColumnType("jsonb");
            entity.Property(x => x.SourceToPlantLinks).HasColumnName("source_to_plant_links").HasColumnType("jsonb");
            entity.Property(x => x.PlantToZoneLinks).HasColumnName("plant_to_zone_links").HasColumnType("jsonb");
            entity.Property(x => x.QualityLimits).HasColumnName("quality_limits").HasColumnType("jsonb");
            entity.Property(x => x.ValidationPolicy).HasColumnName("validation_policy").HasColumnType("jsonb");

            entity.Property(x => x.FrontendInputJson).HasColumnName("frontend_input_json").HasColumnType("jsonb");
            entity.Property(x => x.CanonicalInputJson).HasColumnName("canonical_input_json").HasColumnType("jsonb");
            entity.Property(x => x.SourceDataSnapshotJson).HasColumnName("source_data_snapshot_json").HasColumnType("jsonb");

            // Python-owned — see Entities/MilpModelInput.cs. Left NULL by this backend.
            entity.Property(x => x.ScenarioDataJson).HasColumnName("scenario_data_json").HasColumnType("jsonb");
            entity.Property(x => x.ModelParametersJson).HasColumnName("model_parameters_json").HasColumnType("jsonb");

            entity.Property(x => x.SolverConfigJson).HasColumnName("solver_config_json").HasColumnType("jsonb");

            entity.Property(x => x.CanonicalInputHash).HasColumnName("canonical_input_hash");
            entity.Property(x => x.ScenarioDataHash).HasColumnName("scenario_data_hash");
            entity.Property(x => x.ModelParametersHash).HasColumnName("model_parameters_hash");
            entity.Property(x => x.InputHash).HasColumnName("input_hash");
            entity.Property(x => x.SolverConfigHash).HasColumnName("solver_config_hash");
            entity.Property(x => x.ExecutionKey).HasColumnName("execution_key");

            entity.Property(x => x.ScenarioDataSchemaVersion).HasColumnName("scenario_data_schema_version");
            entity.Property(x => x.ModelParametersSchemaVersion).HasColumnName("model_parameters_schema_version");

            entity.Property(x => x.CreatedAt).HasColumnName("created_at");
            entity.Property(x => x.ResolvedAt).HasColumnName("resolved_at");

            // One immutable input snapshot per Run (AquaBlend_Backend_Final_Integration_
            // Implementation.md §23) — the unique FK is what makes concurrent run creation safe,
            // not an application-level lock.
            entity.HasOne(x => x.Run)
                .WithOne()
                .HasForeignKey<MilpModelInput>(x => x.RunId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(x => x.Scenario)
                .WithMany()
                .HasForeignKey(x => x.ScenarioId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(x => x.ScenarioId);
        });

        modelBuilder.Entity<MilpModelOutput>(entity =>
        {
            entity.ToTable("milp_model_output", "public");
            entity.HasKey(x => x.Id);

            entity.Property(x => x.Id).HasColumnName("id");
            entity.Property(x => x.OriginRunId).HasColumnName("origin_run_id");
            entity.Property(x => x.InputId).HasColumnName("input_id");
            entity.Property(x => x.ScenarioDbId).HasColumnName("scenario_db_id");

            entity.Property(x => x.SchemaVersion).HasColumnName("schema_version");
            entity.Property(x => x.ScenarioExternalId).HasColumnName("scenario_id");
            entity.Property(x => x.ScenarioStatus).HasColumnName("scenario_status");

            entity.Property(x => x.ExecutionKey).HasColumnName("execution_key");
            entity.Property(x => x.InputHash).HasColumnName("input_hash");
            entity.Property(x => x.ModelParametersHash).HasColumnName("model_parameters_hash");

            entity.Property(x => x.MilpModelVersion).HasColumnName("milp_model_version");
            entity.Property(x => x.SolverName).HasColumnName("solver_name");
            entity.Property(x => x.SolverVersion).HasColumnName("solver_version");
            entity.Property(x => x.SolverConfigHash).HasColumnName("solver_config_hash");

            entity.Property(x => x.SolverTerminationCondition).HasColumnName("solver_termination_condition");
            entity.Property(x => x.SolverMessage).HasColumnName("solver_message");
            entity.Property(x => x.SolveTimeMs).HasColumnName("solve_time_ms");

            entity.Property(x => x.RawOutputJson).HasColumnName("raw_output_json").HasColumnType("jsonb");
            entity.Property(x => x.OutputHash).HasColumnName("output_hash");

            entity.Property(x => x.CacheReusable).HasColumnName("cache_reusable");
            entity.Property(x => x.ForcedRecompute).HasColumnName("forced_recompute");

            entity.Property(x => x.StartedAt).HasColumnName("started_at");
            entity.Property(x => x.CompletedAt).HasColumnName("completed_at");
            entity.Property(x => x.UpdatedAt).HasColumnName("updated_at");
            entity.Property(x => x.CreatedAt).HasColumnName("created_at");

            entity.Property(x => x.LoaderStatus).HasColumnName("loader_status");
            entity.Property(x => x.LoaderScenarioReady).HasColumnName("loader_scenario_ready");
            entity.Property(x => x.LoaderValidationIssues).HasColumnName("loader_validation_issues").HasColumnType("jsonb");
            entity.Property(x => x.LoaderChecks).HasColumnName("loader_checks").HasColumnType("jsonb");

            entity.Property(x => x.PreprocessingStatus).HasColumnName("preprocessing_status");
            entity.Property(x => x.PreprocessingWarnings).HasColumnName("preprocessing_warnings").HasColumnType("jsonb");
            entity.Property(x => x.PreprocessingChecks).HasColumnName("preprocessing_checks").HasColumnType("jsonb");

            entity.Property(x => x.OutputConsistencyStatus).HasColumnName("output_consistency_status");
            entity.Property(x => x.OutputConsistencyTolerance).HasColumnName("output_consistency_tolerance");
            entity.Property(x => x.OutputConsistencyChecks).HasColumnName("output_consistency_checks").HasColumnType("jsonb");

            entity.Property(x => x.SolverStatus).HasColumnName("solver_status");
            entity.Property(x => x.SolverIsFeasible).HasColumnName("solver_is_feasible");
            entity.Property(x => x.SolverIsOptimal).HasColumnName("solver_is_optimal");
            entity.Property(x => x.SolverObjectiveValue).HasColumnName("solver_objective_value");

            entity.Property(x => x.TotalDemandMlPerDay).HasColumnName("total_demand_ml_per_day");
            entity.Property(x => x.TotalWithdrawalMlPerDay).HasColumnName("total_withdrawal_ml_per_day");
            entity.Property(x => x.TotalTreatedMlPerDay).HasColumnName("total_treated_ml_per_day");
            entity.Property(x => x.TotalDeliveredMlPerDay).HasColumnName("total_delivered_ml_per_day");

            entity.Property(x => x.SelectedSourceCount).HasColumnName("selected_source_count");
            entity.Property(x => x.ActivePlantCount).HasColumnName("active_plant_count");

            entity.Property(x => x.TotalSourceFixedCost).HasColumnName("total_source_fixed_cost");
            entity.Property(x => x.TotalSourceVariableCost).HasColumnName("total_source_variable_cost");
            entity.Property(x => x.TotalPlantFixedCost).HasColumnName("total_plant_fixed_cost");
            entity.Property(x => x.TotalPlantVariableCost).HasColumnName("total_plant_variable_cost");
            entity.Property(x => x.ReconstructedTotalCost).HasColumnName("reconstructed_total_cost");
            entity.Property(x => x.TotalCost).HasColumnName("total_cost");
            entity.Property(x => x.CostReconciles).HasColumnName("cost_reconciles");

            entity.Property(x => x.Sources).HasColumnName("sources").HasColumnType("jsonb");
            entity.Property(x => x.Plants).HasColumnName("plants").HasColumnType("jsonb");
            entity.Property(x => x.DemandZones).HasColumnName("demand_zones").HasColumnType("jsonb");
            entity.Property(x => x.FlowsSourceToPlant).HasColumnName("flows_source_to_plant").HasColumnType("jsonb");
            entity.Property(x => x.FlowsPlantToZone).HasColumnName("flows_plant_to_zone").HasColumnType("jsonb");
            entity.Property(x => x.Quality).HasColumnName("quality").HasColumnType("jsonb");
            entity.Property(x => x.BindingConstraintsSummary).HasColumnName("binding_constraints_summary").HasColumnType("jsonb");
            entity.Property(x => x.Warnings).HasColumnName("warnings").HasColumnType("jsonb");

            entity.HasOne(x => x.OriginRun)
                .WithMany()
                .HasForeignKey(x => x.OriginRunId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(x => x.Input)
                .WithMany()
                .HasForeignKey(x => x.InputId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(x => x.Scenario)
                .WithMany()
                .HasForeignKey(x => x.ScenarioDbId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(x => x.OriginRunId);
            entity.HasIndex(x => x.InputId);
            entity.HasIndex(x => x.ScenarioDbId);
        });

        modelBuilder.Entity<MilpAiOutput>(entity =>
        {
            entity.ToTable("milp_ai_output", "public");
            entity.HasKey(x => x.Id);

            entity.Property(x => x.Id).HasColumnName("id");
            entity.Property(x => x.OriginRunId).HasColumnName("origin_run_id");
            entity.Property(x => x.MilpOutputId).HasColumnName("milp_output_id");
            entity.Property(x => x.ScenarioId).HasColumnName("scenario_id");

            entity.Property(x => x.Status).HasColumnName("status");

            entity.Property(x => x.AiProvider).HasColumnName("ai_provider");
            entity.Property(x => x.AiModel).HasColumnName("ai_model");
            entity.Property(x => x.AiModelVersion).HasColumnName("ai_model_version");
            entity.Property(x => x.PromptVersion).HasColumnName("prompt_version");
            entity.Property(x => x.AnalysisVersion).HasColumnName("analysis_version");
            entity.Property(x => x.AiContractVersion).HasColumnName("ai_contract_version");

            entity.Property(x => x.MilpOutputHash).HasColumnName("milp_output_hash");
            entity.Property(x => x.AiCacheKey).HasColumnName("ai_cache_key");

            entity.Property(x => x.AiInputJson).HasColumnName("ai_input_json").HasColumnType("jsonb");

            entity.Property(x => x.ExecutiveSummary).HasColumnName("executive_summary");
            entity.Property(x => x.DecisionExplanation).HasColumnName("decision_explanation");

            entity.Property(x => x.KeyFindings).HasColumnName("key_findings").HasColumnType("jsonb");
            entity.Property(x => x.Anomalies).HasColumnName("anomalies").HasColumnType("jsonb");
            entity.Property(x => x.Recommendations).HasColumnName("recommendations").HasColumnType("jsonb");
            entity.Property(x => x.Warnings).HasColumnName("warnings").HasColumnType("jsonb");
            entity.Property(x => x.RiskAssessment).HasColumnName("risk_assessment").HasColumnType("jsonb");
            entity.Property(x => x.SourceAnalysis).HasColumnName("source_analysis").HasColumnType("jsonb");
            entity.Property(x => x.PlantAnalysis).HasColumnName("plant_analysis").HasColumnType("jsonb");
            entity.Property(x => x.QualityAnalysis).HasColumnName("quality_analysis").HasColumnType("jsonb");
            entity.Property(x => x.Limitations).HasColumnName("limitations").HasColumnType("jsonb");

            entity.Property(x => x.RawAiJson).HasColumnName("raw_ai_json").HasColumnType("jsonb");
            entity.Property(x => x.AiOutputHash).HasColumnName("ai_output_hash");

            entity.Property(x => x.CacheReusable).HasColumnName("cache_reusable");
            entity.Property(x => x.ForcedRecompute).HasColumnName("forced_recompute");

            entity.Property(x => x.LatencyMs).HasColumnName("latency_ms");
            entity.Property(x => x.PromptTokens).HasColumnName("prompt_tokens");
            entity.Property(x => x.CompletionTokens).HasColumnName("completion_tokens");
            entity.Property(x => x.TotalTokens).HasColumnName("total_tokens");

            entity.Property(x => x.ErrorCode).HasColumnName("error_code");
            entity.Property(x => x.ErrorMessage).HasColumnName("error_message");

            entity.Property(x => x.CreatedAt).HasColumnName("created_at");
            entity.Property(x => x.StartedAt).HasColumnName("started_at");
            entity.Property(x => x.CompletedAt).HasColumnName("completed_at");
            entity.Property(x => x.UpdatedAt).HasColumnName("updated_at");

            entity.HasOne(x => x.OriginRun)
                .WithMany()
                .HasForeignKey(x => x.OriginRunId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(x => x.MilpOutput)
                .WithMany()
                .HasForeignKey(x => x.MilpOutputId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(x => x.Scenario)
                .WithMany()
                .HasForeignKey(x => x.ScenarioId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(x => x.OriginRunId);
            entity.HasIndex(x => x.MilpOutputId);
            entity.HasIndex(x => x.ScenarioId);
        });

        // Run's pointer FKs into the three tables above, plus the self-referencing
        // "reused from" pointers — each unidirectional with no reverse collection, so none of
        // these can form a cascade-delete cycle with the relationships configured above.
        modelBuilder.Entity<Run>(entity =>
        {
            entity.HasOne(r => r.MilpInput)
                .WithMany()
                .HasForeignKey(r => r.MilpInputId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(r => r.MilpOutput)
                .WithMany()
                .HasForeignKey(r => r.MilpOutputId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(r => r.AiOutput)
                .WithMany()
                .HasForeignKey(r => r.AiOutputId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne<Run>()
                .WithMany()
                .HasForeignKey(r => r.ReusedMilpFromRunId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne<Run>()
                .WithMany()
                .HasForeignKey(r => r.ReusedAiFromRunId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(r => r.MilpInputId);
            entity.HasIndex(r => r.MilpOutputId);
            entity.HasIndex(r => r.AiOutputId);
        });
    }
}
