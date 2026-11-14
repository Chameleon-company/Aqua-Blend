using Xunit;

// Every test class here spins up a full AquaBlendApiFactory (a real ASP.NET Core host running
// Program.cs's startup seeding against an EF Core InMemory database). SeedData.Initialize's
// "if not already present, add" checks are not safe against two hosts' startups racing
// concurrently, so xUnit's default "different test classes run in parallel" behavior can
// intermittently corrupt seeding (observed as a duplicate-key exception building
// Data/SeedData.cs's WaterSources dictionary) purely from timing, independent of any single
// test's correctness. Forcing collections to run sequentially removes that race.
[assembly: CollectionBehavior(DisableTestParallelization = true)]
