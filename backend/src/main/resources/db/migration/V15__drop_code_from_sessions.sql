-- V15: Remove original_code and original_logs from sessions table
--
-- MEDIUM-4 FIX: Large TEXT fields (up to 5MB each per row) were stored in
-- PostgreSQL while the same content already existed on the filesystem in the
-- session workspace. This doubled storage, bloated DB backups, and caused
-- PostgreSQL to read multi-megabyte TOAST data even for simple status queries.
--
-- The workspace (session.workspacePath/main.{ext} and logs.txt) is now the
-- single source of truth. WorkspaceService.readCodeFile() / readLogFile()
-- are used wherever the content is needed (AsyncPipelineExecutor, ChatService,
-- OrchestrationService.processChat).
--
-- Backfill note:
--   Existing rows will have NULL in these columns after the ALTER below.
--   The ORM fields are mapped with insertable=false, updatable=false so JPA
--   will not attempt to write them. readCodeFile() / readLogFile() fall back
--   to "" / null gracefully if the workspace was already cleaned up.
--
-- Why DROP COLUMN rather than just not writing?
--   Dropping removes the TOAST overhead entirely — PostgreSQL no longer
--   allocates or reads the TOAST chunks even for existing rows.
--   It also enforces at the DB level that nothing can write here again.
--
-- If you need to roll this back: restore from backup before running this
-- migration, or re-add the columns with ALTER TABLE ... ADD COLUMN original_code TEXT.

ALTER TABLE sessions DROP COLUMN IF EXISTS original_code;
ALTER TABLE sessions DROP COLUMN IF EXISTS original_logs;