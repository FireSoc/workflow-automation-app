-- Grant the application role full access to tables and sequences in public schema.
-- Database: agile (e.g. server "Agile local"). Run from backend/ as a user that can connect:
--   On macOS (Postgres.app/Homebrew): role "postgres" often doesn't exist; use your system user:
--     psql -d agile -f scripts/grant_permissions.sql
--   On Linux/Docker (postgres role exists):
--     psql -U postgres -d agile -f scripts/grant_permissions.sql
-- If your DATABASE_URL uses a different role than 'agile', replace it below.

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO agile;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO agile;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO agile;
