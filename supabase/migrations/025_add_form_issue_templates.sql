ALTER TABLE customer_request_forms
  ADD COLUMN IF NOT EXISTS linear_template_id TEXT,
  ADD COLUMN IF NOT EXISTS linear_template_name TEXT,
  ADD COLUMN IF NOT EXISTS allow_template_selection BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_customer_request_forms_linear_template_id
  ON customer_request_forms(linear_template_id);
