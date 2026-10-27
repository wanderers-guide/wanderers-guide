#!/bin/bash
set -euo pipefail

# PG17 adds a session setting absent on PG15/16. Schema and row data stay intact.
# Restore modes also remove guards unsupported by older psql clients.
case "${1:-portable}" in
  portable) sed '/^SET transaction_timeout = 0;$/d' ;;
  data) sed -e '/^SET transaction_timeout = 0;$/d' -e '/^\\restrict /d' -e '/^\\unrestrict /d' ;;
  schema) sed -e '/^SET transaction_timeout = 0;$/d' -e '/^\\restrict /d' -e '/^\\unrestrict /d' -e '/^CREATE TRIGGER /d' ;;
  *) echo 'Usage: filter-pg-dump.sh [portable|data|schema]' >&2; exit 2 ;;
esac
