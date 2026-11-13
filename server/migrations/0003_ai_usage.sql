-- AI usage per user and day (docs/04-features/ai-platform.md): quotas and the cost log.
CREATE TABLE ai_usage (
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  day date NOT NULL,
  requests integer NOT NULL DEFAULT 0,
  input_tokens bigint NOT NULL DEFAULT 0,
  output_tokens bigint NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, day)
);
CREATE INDEX ai_usage_day ON ai_usage (day);
