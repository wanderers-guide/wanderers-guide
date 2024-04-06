#!/bin/bash

# This script deletes user created content from rules tables

# Tables with a `content_source_id` column
user_data_tables=(
  "ability_block"
  "ancestry"
  "archetype"
  "background"
  "class"
  "creature"
  "item"
  "language"
  "spell"
  "trait"
)

for table in ${user_data_tables[@]}
do
  # User generated content is defined by a content source entry with a `user_id`. 
  # We want to keep rows that the `user_id` is null.
  query="DELETE FROM public.${table} AS t USING public.content_source AS cs WHERE t.content_source_id = cs.id AND cs.user_id IS NOT NULL;"
  psql "$1" -c "$query"
done