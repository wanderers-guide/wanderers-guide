#!/bin/bash

# The cluster version running in the remote server
export PGCLUSTER=15/main

# Dump the schema only
echo Dumping schema
pg_dump --schema-only --table="public.*" "$1" > schema.sql

# Dump the data only excluding user tables
echo Dumping full data
pg_dump --data-only --table="public.*" -T "public.public_user" -T "public.campaign" -T "public.character" -T "public.encounter" -T "public.content_update" "$1" > data.sql

