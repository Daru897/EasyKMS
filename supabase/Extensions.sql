-- UUID support
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Text search / similarity
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Required for EXCLUDE USING gist with equality
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- Performance monitoring (optional in Supabase, but allowed)
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
