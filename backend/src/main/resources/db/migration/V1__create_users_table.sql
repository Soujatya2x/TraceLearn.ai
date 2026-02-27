-- V1: Create users table with authentication support
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email           VARCHAR(255) NOT NULL UNIQUE,
    password_hash   VARCHAR(255),
    display_name    VARCHAR(150) NOT NULL,
    avatar_url      VARCHAR(512),
    auth_provider   VARCHAR(20) NOT NULL DEFAULT 'LOCAL',
    provider_id     VARCHAR(255),
    role            VARCHAR(20) NOT NULL DEFAULT 'USER',
    email_verified  BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_provider ON users(auth_provider, provider_id);
