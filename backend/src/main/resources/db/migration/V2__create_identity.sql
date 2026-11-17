CREATE SCHEMA IF NOT EXISTS identity;

CREATE TABLE identity.app_user (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	google_subject text NOT NULL UNIQUE,
	email text NOT NULL,
	display_name text NOT NULL,
	picture_url text,
	created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE identity.spring_session (
	primary_id char(36) NOT NULL,
	session_id char(36) NOT NULL,
	creation_time bigint NOT NULL,
	last_access_time bigint NOT NULL,
	max_inactive_interval int NOT NULL,
	expiry_time bigint NOT NULL,
	principal_name varchar(100),
	CONSTRAINT spring_session_pk PRIMARY KEY (primary_id)
);

CREATE UNIQUE INDEX spring_session_ix1 ON identity.spring_session (session_id);
CREATE INDEX spring_session_ix2 ON identity.spring_session (expiry_time);
CREATE INDEX spring_session_ix3 ON identity.spring_session (principal_name);

CREATE TABLE identity.spring_session_attributes (
	session_primary_id char(36) NOT NULL,
	attribute_name varchar(200) NOT NULL,
	attribute_bytes bytea NOT NULL,
	CONSTRAINT spring_session_attributes_pk PRIMARY KEY (session_primary_id, attribute_name),
	CONSTRAINT spring_session_attributes_fk FOREIGN KEY (session_primary_id) REFERENCES identity.spring_session (primary_id) ON DELETE CASCADE
);
