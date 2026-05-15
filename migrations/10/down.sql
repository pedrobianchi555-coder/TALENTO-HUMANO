-- Drop asset_incidents table
DROP INDEX idx_asset_incidents_assignment_id;
DROP INDEX idx_asset_incidents_asset_id;
DROP TABLE asset_incidents;

-- Drop asset_maintenance table
DROP INDEX idx_asset_maintenance_assignment_id;
DROP INDEX idx_asset_maintenance_asset_id;
DROP TABLE asset_maintenance;