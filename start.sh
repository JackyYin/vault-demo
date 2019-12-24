#!/bin/sh

export $(grep -v '^#' .env | xargs)
export VAULT_ADDR=http://localhost:${VAULT_PORT}

docker-compose up -d
echo ${VAULT_TOKEN} | vault login -

vault secrets enable database

vault write database/config/my-mongodb-database \
  plugin_name=mongodb-database-plugin \
  allowed_roles="my-role" \
  connection_url="mongodb://${MONGO_USERNAME}:${MONGO_PASSWORD}@${MONGO_HOST}:${MONGO_PORT}/admin" 

vault write database/roles/my-role \
  db_name=my-mongodb-database \
  creation_statements='{ "db": "admin", "roles": [{"role": "readWrite", "db": "'"${MONGO_DATABASE}"'"}]}' \
  default_ttl="5s" \
  max_ttl="10s"
