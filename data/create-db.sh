#!/bin/bash

echo Dropping schema
psql -d "$1" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO postgres; GRANT ALL ON SCHEMA public TO public;"

# The dump's trigram indexes need pg_trgm in public; a schema-only dump of
# public.* doesn't carry CREATE EXTENSION itself.
echo Ensuring pg_trgm extension
psql -d "$1" -c "CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;"

echo Recreating schema
psql  -d "$1" -a -f schema.sql

echo Restoring data
psql  -d "$1" -a -f data.sql
