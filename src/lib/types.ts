export type UserRole = 'admin' | 'authorised' | 'read_only'

export interface AppUser {
  id: string
  auth_id: string | null
  first_name: string | null
  last_name: string | null
  email: string | null
  role: UserRole
  created_at: string
}

export interface OrgEntity {
  id: string
  created_at: string
  legal_name: string | null
  include_entity: boolean | null
  location: string[] | null
  products: string | null
  product_description: string | null
  data_types: string | null
  url_link: string | null
  name: string | null
  published: boolean | null
  slug: string | null
}

export interface DpaDocument {
  id: string
  org_id: string | null
  dpa_date: string | null
  dpa_date_notes: string | null
  jurisdiction_summary: string | null
  data_held_explicit: unknown | null
  data_held_summary: string | null
  transfer_out_choice: string | null
  SSC_in_place: string | null
  SSC_summary: string | null
  tech_measures: string | null
  tech_measure_contractual: string | null
  tech_measure_details: string | null
  sub_processor_auth: string | null
  sub_auth_details: string | null
  flowdown: string | null
  flowdown_details: string | null
  process_on_instruction: string | null
  instruction_details: string | null
  rights_assistance: string | null
  rights_assistance_details: string | null
  staff_conf: string | null
  staff_conf_details: string | null
  data_breach_notice: string | null
  data_termination: string | null
  audit_rights_type: string | null
  audit_rights_summary: string | null
  assistance: string | null
  assistance_details: string | null
  dpa_incorp: string | null
  dpa_incorp_details: string | null
  created_at: string | null
  current_status: string | null
}

export interface Change {
  id: string
  date_of_review: string | null
  is_changed: boolean | null
  summary_changes: string | null
  needs_review: boolean | null
  need_review_reason: string | null
  doc_id: string | null
  status: string | null
  changed_by: string | null
}

export interface RecordSummary {
  org_id: string
  name: string | null
  slug: string | null
  published: boolean | null
  dpa_date: string | null
  current_status: string | null
  needs_review: boolean | null
  doc_id: string
}
