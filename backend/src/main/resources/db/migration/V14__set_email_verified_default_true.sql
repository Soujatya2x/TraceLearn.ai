-- V14: Set email_verified default to TRUE
--
-- MEDIUM-2 FIX: The column was created with DEFAULT FALSE, implying email
-- verification is enforced. It is not — there is no verification token,
-- no email sending service, and no endpoint to verify an address. Storing
-- false and never setting it to true is dead code that misrepresents the
-- security posture of the application.
--
-- We adopt Option A: be honest about the current state.
--   - Change the column default to TRUE so new signups are marked verified.
--   - Backfill existing rows: any LOCAL user stuck at FALSE has no way to
--     become verified (no verification flow exists), so we set them all to
--     TRUE now. OAuth users (GOOGLE, GITHUB) were already set to TRUE in
--     CustomOAuth2UserService, so this only affects LOCAL accounts.
--
-- When real email verification is added:
--   1. Add a new migration: ALTER TABLE users ADD COLUMN verification_token VARCHAR(255)
--   2. Revert this default back to FALSE in that same migration
--   3. On signUp, generate a secure token, store it, send via SES/SendGrid
--   4. Add GET /api/v1/auth/verify?token=xxx endpoint
--   5. Enforce in AnalyzeController.resolveUser(): throw 403 if !user.isEmailVerified()

-- Backfill: mark all existing unverified LOCAL users as verified
-- (they have no path to verification, so false is permanently wrong for them)
UPDATE users
SET    email_verified = TRUE
WHERE  email_verified = FALSE
AND    auth_provider  = 'LOCAL';

-- Change column default so future INSERT statements without an explicit
-- email_verified value get TRUE instead of FALSE.
-- JPA @Builder.Default is also updated to true in User.java, but the DB
-- default is the authoritative source for any raw SQL inserts or migrations.
ALTER TABLE users
    ALTER COLUMN email_verified SET DEFAULT TRUE;