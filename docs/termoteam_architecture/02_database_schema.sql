-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector"; -- For RAG embeddings

-- Tenants (f.eks. TermoTeam + senere andre)
CREATE TABLE tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Users (enkelt oppsett – kan kobles til Supabase auth.users)
CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  email text NOT NULL UNIQUE,
  name text,
  role text NOT NULL DEFAULT 'user', -- 'montor','kontrollor','admin'
  created_at timestamptz DEFAULT now()
);

-- Prosjekter / anlegg
CREATE TABLE projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  name text NOT NULL,
  address text,
  customer_name text,
  customer_type text,
  medium text,             -- CO2, R290, etc.
  ps numeric,
  volume_l numeric,
  commissioned_at date,
  decommissioned_at date,
  status text NOT NULL DEFAULT 'draft', -- 'draft','documenting','in_operation','archived'
  external_id text,        -- fra ERP/CRM hvis ønskelig
  created_at timestamptz DEFAULT now()
);

-- Noder (FDV, CE, RISK, COMPONENT, CHECKLIST_INSTANCE, etc.)
CREATE TABLE nodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  project_id uuid NOT NULL REFERENCES projects(id),
  type text NOT NULL,      -- 'FDV','CE_PED','RISK','COMPONENT','MAINTENANCE_HISTORY','MAINTENANCE_REPORT','CHECKLIST_INSTANCE','AVVIK','CUSTOMER_FOLDER',...
  title text NOT NULL,
  status text NOT NULL DEFAULT 'draft', -- 'draft','pending_review','approved','archived'
  template_id text,
  data jsonb,              -- fleksibelt dokumentinnhold/fields
  snapshot_id uuid,
  created_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Relasjoner mellom noder (DAG)
CREATE TABLE node_edges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  project_id uuid NOT NULL REFERENCES projects(id),
  from_node_id uuid NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
  to_node_id uuid NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
  relation_type text NOT NULL, -- 'DEPENDS_ON','GENERATES','UPDATES','SUMMARIZES'
  created_at timestamptz DEFAULT now()
);

-- Revisjonshistorikk per node
CREATE TABLE node_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id uuid NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
  revision_number int NOT NULL,
  change_type text NOT NULL,   -- 'USER_EDIT','AI_GENERATION','MAINTENANCE_UPDATE','APPROVAL'
  severity text,               -- null,'INFO','VARSEL'
  description text,
  changed_by uuid REFERENCES users(id),
  previous_data jsonb,
  new_data jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX node_revisions_node_idx ON node_revisions(node_id, revision_number);

-- Filer (originaler)
CREATE TABLE files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  project_id uuid NOT NULL REFERENCES projects(id),
  uploaded_by uuid REFERENCES users(id),
  source text NOT NULL,        -- 'INTERNAL_APP','EXTERNAL_API','EMAIL'
  original_url text NOT NULL,  -- storage path
  mime_type text NOT NULL,
  size_bytes bigint,
  external_reference text,
  created_at timestamptz DEFAULT now()
);

-- Normaliserte varianter (PDF/Text/JSON)
CREATE TABLE file_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id uuid NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  variant_type text NOT NULL,  -- 'NORMALIZED_PDF','PLAIN_TEXT','STRUCTURED_JSON'
  url text NOT NULL,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

-- Vedlikeholdshendelser
CREATE TABLE maintenance_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  project_id uuid NOT NULL REFERENCES projects(id),
  node_id uuid,                -- typisk COMPONENT eller MAINTENANCE_HISTORY node
  performed_by text,
  source text NOT NULL,        -- 'INTERNAL_APP','EXTERNAL_API'
  performed_at timestamptz NOT NULL,
  event_type text NOT NULL,    -- 'PERIODIC_SERVICE','REPAIR','INSPECTION','TRYKKTEST',...
  status text NOT NULL DEFAULT 'RECEIVED', -- 'RECEIVED','PARSED','NEEDS_REVIEW','APPROVED'
  raw_payload jsonb,
  created_at timestamptz DEFAULT now()
);

-- Link mellom maintenance-event og dokument-noder (MAINTENANCE_REPORT etc.)
CREATE TABLE maintenance_event_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  maintenance_event_id uuid NOT NULL REFERENCES maintenance_events(id) ON DELETE CASCADE,
  node_id uuid NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- Oppgavemaler
CREATE TABLE task_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  code text NOT NULL,
  name text NOT NULL,
  description text,
  config jsonb,
  created_at timestamptz DEFAULT now()
);

-- Tasks
CREATE TABLE tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  project_id uuid NOT NULL REFERENCES projects(id),
  task_template_id uuid REFERENCES task_templates(id),
  code text NOT NULL,
  node_id uuid REFERENCES nodes(id),
  maintenance_event_id uuid REFERENCES maintenance_events(id),
  status text NOT NULL DEFAULT 'OPEN', -- 'OPEN','IN_PROGRESS','BLOCKED','DONE','CANCELLED'
  priority int DEFAULT 5,
  assigned_to uuid REFERENCES users(id),
  created_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  meta jsonb
);

-- Task-run logs
CREATE TABLE task_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  step text NOT NULL,
  status text NOT NULL,         -- 'PENDING','RUNNING','FAILED','COMPLETED'
  started_at timestamptz,
  finished_at timestamptz,
  log jsonb,
  created_at timestamptz DEFAULT now()
);

-- Sjekkliste-maler
CREATE TABLE checklist_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  code text NOT NULL,
  name text NOT NULL,
  description text,
  scope text,                   -- 'PROJECT','COMPONENT','MAINTENANCE_EVENT'
  schema jsonb NOT NULL,
  created_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Sjekkliste-instans (utført)
CREATE TABLE checklist_instances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  project_id uuid NOT NULL REFERENCES projects(id),
  template_id uuid NOT NULL REFERENCES checklist_templates(id),
  node_id uuid REFERENCES nodes(id),
  maintenance_event_id uuid REFERENCES maintenance_events(id),
  status text NOT NULL DEFAULT 'draft', -- 'draft','in_progress','completed','approved'
  filled_by uuid REFERENCES users(id),
  filled_at timestamptz,
  data jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Avvik
CREATE TABLE avvik (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  project_id uuid NOT NULL REFERENCES projects(id),
  node_id uuid REFERENCES nodes(id),
  checklist_instance_id uuid REFERENCES checklist_instances(id),
  maintenance_event_id uuid REFERENCES maintenance_events(id),
  type text,
  title text NOT NULL,
  description text NOT NULL,
  severity text NOT NULL,       -- 'LOW','MEDIUM','HIGH','CRITICAL'
  status text NOT NULL DEFAULT 'OPEN', -- 'OPEN','IN_PROGRESS','WAITING_CUSTOMER','CLOSED','REJECTED'
  created_by uuid REFERENCES users(id),
  assigned_to uuid REFERENCES users(id),
  due_date date,
  closed_at timestamptz,
  closed_by uuid REFERENCES users(id),
  closure_comment text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE avvik_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  avvik_id uuid NOT NULL REFERENCES avvik(id) ON DELETE CASCADE,
  action_type text NOT NULL,    -- 'COMMENT','STATUS_CHANGE','ATTACHMENT','LINK_NODE'
  comment text,
  new_status text,
  attachment_file_id uuid REFERENCES files(id),
  linked_node_id uuid REFERENCES nodes(id),
  created_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now()
);

-- Rule engine
CREATE TABLE rule_sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id), -- null for global (EU/NO)
  name text NOT NULL,
  level text NOT NULL,      -- 'GLOBAL','TENANT','CUSTOMER','PROJECT'
  version text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_set_id uuid NOT NULL REFERENCES rule_sets(id) ON DELETE CASCADE,
  code text NOT NULL,
  description text,
  severity text,           -- 'INFO','WARNING','REQUIRED'
  applies_to text,         -- 'PROJECT','COMPONENT','DOCUMENT_FIELD'
  condition jsonb NOT NULL,
  outcome jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE rule_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id uuid NOT NULL REFERENCES rules(id) ON DELETE CASCADE,
  source_type text NOT NULL,   -- 'EU_LAW','TEK17','STANDARD_METADATA','INTERNAL'
  source_ref text NOT NULL,
  url text,
  notes text
);

CREATE TABLE rule_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  base_rule_id uuid NOT NULL REFERENCES rules(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES tenants(id),
  project_id uuid REFERENCES projects(id),
  override_type text NOT NULL, -- 'DISABLE','WEAKEN','STRENGTHEN','CUSTOM_OUTCOME'
  override_condition jsonb,
  override_outcome jsonb,
  reason text,
  created_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now()
);

-- Snapshots & dokumentproveniens (kortversjon)
CREATE TABLE generation_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  project_id uuid NOT NULL REFERENCES projects(id),
  node_id uuid REFERENCES nodes(id),
  rule_set_versions jsonb,
  used_document_ids uuid[],
  used_chunk_ids uuid[],
  facts jsonb,
  ai_model text,
  prompt_hash text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE document_segments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id uuid NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
  segment_type text NOT NULL,  -- 'SECTION','PARAGRAPH','SENTENCE'
  parent_segment_id uuid REFERENCES document_segments(id),
  text text NOT NULL,
  start_char int,
  end_char int,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE document_segment_provenance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  segment_id uuid NOT NULL REFERENCES document_segments(id) ON DELETE CASCADE,
  snapshot_id uuid NOT NULL REFERENCES generation_snapshots(id) ON DELETE CASCADE,
  rule_ids uuid[],
  source_chunk_ids uuid[],
  model_name text,
  created_at timestamptz DEFAULT now()
);

-- RLS Policies (Security)
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE avvik ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see projects in their tenant
CREATE POLICY "tenant_isolation_projects" ON projects
  USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- Policy: Users can only see nodes in their tenant
CREATE POLICY "tenant_isolation_nodes" ON nodes
  USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- Policy: Users can only see avvik in their tenant
CREATE POLICY "tenant_isolation_avvik" ON avvik
  USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

