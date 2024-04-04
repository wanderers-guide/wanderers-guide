#!/bin/bash

# Dump the schema only
psql  -d "$1" -a -f schema.sql
