DROP INDEX IF EXISTS idx_customer_request_forms_linear_template_id;

ALTER TABLE customer_request_forms
  DROP COLUMN IF EXISTS allow_template_selection,
  DROP COLUMN IF EXISTS linear_template_name,
  DROP COLUMN IF EXISTS linear_template_id;
