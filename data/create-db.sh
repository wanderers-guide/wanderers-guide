#!/bin/bash

echo Recreating schema
psql  -d "$1" -a -f schema.sql

echo Restoring data
psql  -d "$1" -a -f data.sql
