-- Create multiple databases for microservices
SELECT 'CREATE DATABASE auth_db'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'auth_db')\gexec

SELECT 'CREATE DATABASE identity_db'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'identity_db')\gexec
