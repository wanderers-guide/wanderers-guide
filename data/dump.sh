#!/bin/bash

# The cluster version running in the remote server
export PGCLUSTER=15/main

# Dump the schema only
pg_dump --schema-only --table="public.*" "$1" > schema.sql
