#!/bin/bash

# The cluster version running in the remote server
export PGCLUSTER=15/main

# Dump the schema only
pg_dump --schema-only --table="public.*" "$1" > schema.sql

# Dump the data
pg_dump --data-only --table="public.*" --exclude-table="public.public_user" "$1" > data.sql
