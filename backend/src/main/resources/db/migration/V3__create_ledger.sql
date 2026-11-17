CREATE TABLE ledger.member (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	name text NOT NULL CHECK (btrim(name) <> ''),
	email text CHECK (email IS NULL OR btrim(email) <> ''),
	created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX member_name_key ON ledger.member (lower(name));
CREATE UNIQUE INDEX member_email_key ON ledger.member (lower(email)) WHERE email IS NOT NULL;

CREATE TABLE ledger.expense (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	type text NOT NULL CHECK (type IN ('PERSONAL', 'GROUP')),
	occurred_on date NOT NULL,
	note text NOT NULL CHECK (btrim(note) <> ''),
	share_amount bigint NOT NULL CHECK (share_amount > 0),
	owner_shares int NOT NULL DEFAULT 0 CHECK (owner_shares >= 0),
	created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
	updated_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX expense_occurred_on_ix ON ledger.expense (occurred_on DESC, created_at DESC);

CREATE TABLE ledger.expense_share (
	expense_id uuid NOT NULL REFERENCES ledger.expense (id) ON DELETE CASCADE,
	member_id uuid NOT NULL REFERENCES ledger.member (id),
	shares int NOT NULL CHECK (shares >= 1),
	PRIMARY KEY (expense_id, member_id)
);

CREATE INDEX expense_share_member_ix ON ledger.expense_share (member_id);

CREATE TABLE ledger.payment (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	member_id uuid NOT NULL REFERENCES ledger.member (id),
	occurred_on date NOT NULL,
	amount bigint NOT NULL CHECK (amount > 0),
	note text NOT NULL DEFAULT 'Paid' CHECK (btrim(note) <> ''),
	created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX payment_member_ix ON ledger.payment (member_id);
