-- One-off data fix: align WaterSource.Type with the agreed source_type vocabulary
-- (reservoir / river / groundwater, matching the MILP model output contract exactly).
--
-- Background: WaterSource.Type previously used ad hoc values ("Surface", "Groundwater").
-- "Surface" was never a real source_type - it's the taxonomy category that contains
-- "reservoir" and "river", not a sibling of them. There is no database check constraint
-- on this column (see docs/database.md), so this data fix - not a schema migration - is
-- what brings any existing dev database in line with the current SeedData.cs values.
--
-- Safe to run multiple times. Run against your local dev database only.

UPDATE "WaterSources" SET "Type" = 'reservoir'   WHERE "Type" = 'Surface';
UPDATE "WaterSources" SET "Type" = 'groundwater' WHERE "Type" = 'Groundwater';

-- If your dev database has other ad hoc values not covered above, check what's
-- actually there before deciding how to map it:
-- SELECT DISTINCT "Type" FROM "WaterSources";
