#!/bin/bash

echo Dropping schema
psql -d "$1" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO postgres; GRANT ALL ON SCHEMA public TO public;"

echo Recreating schema
psql  -d "$1" -a -f schema.sql

echo Restoring data
psql  -d "$1" -a -f data.sql
