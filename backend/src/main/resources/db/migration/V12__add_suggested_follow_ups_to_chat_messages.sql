-- V12: Add suggested_follow_ups column to chat_messages
--
-- Stores the AI Agent's suggested follow-up prompts alongside each ASSISTANT message.
-- JSON array TEXT, e.g. '["What is a guard clause?", "Show me the fix"]'
-- NULL on USER and SYSTEM messages — never populated for those roles.
--
-- Why TEXT not a join table: suggestedFollowUps are ephemeral display data
-- tied to a single message. A separate table adds a join for no gain.

ALTER TABLE chat_messages
    ADD COLUMN suggested_follow_ups TEXT NULL;

COMMENT ON COLUMN chat_messages.suggested_follow_ups
    IS 'JSON array of AI-suggested follow-up prompts. Only set on ASSISTANT role messages.';