ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS current_position VARCHAR(150);
ALTER TABLE users ADD COLUMN IF NOT EXISTS company VARCHAR(150);

CREATE TABLE IF NOT EXISTS user_follows (
    follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    followed_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (follower_id, followed_id),
    CONSTRAINT ck_user_follow_not_self CHECK (follower_id <> followed_id)
);

CREATE TABLE IF NOT EXISTS role_change_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    "current_role" VARCHAR(50) NOT NULL CHECK ("current_role" IN ('Student', 'Alumni')),
    requested_role VARCHAR(50) NOT NULL CHECK (requested_role IN ('Student', 'Alumni')),
    reason TEXT NOT NULL CHECK (length(trim(reason)) >= 15),
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    review_note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT ck_role_change_request_different_roles CHECK ("current_role" <> requested_role)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_role_change_requests_pending_user
    ON role_change_requests(user_id)
    WHERE status = 'PENDING';