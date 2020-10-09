#!/bin/bash

#!/bin/bash
pwd
echo $DATABASE_URL
echo $GRAPHQL_PORT
echo $NODE_ENV

START_CMD="postgraphile
  -n 0.0.0.0
  --watch
  --dynamic-json
  --no-setof-functions-contain-nulls
  --no-ignore-rbac
  --no-ignore-indexes
  --show-error-stack=json
  --extended-errors hint,detail,errcode
  --append-plugins @graphile-contrib/pg-simplify-inflector,postgraphile-plugin-connection-filter
  --export-schema-graphql ./schema/coordinate.schema.graphql
  --graphiql "/graphiql"
  --enhance-graphiql
  --allow-explain
  --enable-query-batching
  --legacy-relations omit
  --connection $DATABASE_URL
  --port $GRAPHQL_PORT
  --schema public
  "
echo $START_CMD
$START_CMD
tail -f /dev/null
