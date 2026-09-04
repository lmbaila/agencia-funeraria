#!/bin/sh
set -e

echo "A aplicar migrações da base de dados..."
npx prisma migrate deploy

echo "A semear dados iniciais (planos e administrador)..."
npx prisma db seed || true

echo "A iniciar a API..."
node dist/main.js
