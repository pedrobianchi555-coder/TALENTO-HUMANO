export interface AuthUser {
  id: string;
  email: string;
}

/** @deprecated Use AuthUser */
export type MochaUser = AuthUser;

export interface UserProfile {
  id: number;
  mocha_user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  ci: string;
  phone?: string;
  role: 'EMPLOYEE' | 'HR';
  photo_url?: string;
  status: 'ACTIVE' | 'INACTIVE';
  birth_date?: string | null;
  department?: string;
  position?: string;
  payroll_type?: 'OPERARIO' | 'EMPLEADO' | 'CONFIDENCIAL';
  base_salary?: number;
  manager_id?: number;
  hr_permissions?: string;
  created_at: string;
  updated_at: string;
  company_id?: number;
  sede?: 'El Pilar' | 'Caracas' | 'Sur del Lago' | 'Miranda' | 'Apure';
  company_name?: string;
  shirt_size?: string;
  pants_size?: string;
  boots_size?: string;
}

export interface EnhancedUser extends AuthUser {
  profile?: UserProfile;
  google_user_data?: {
    picture?: string;
    name?: string;
    given_name?: string;
    family_name?: string;
  };
}

export interface FamilyDependent {
  id: number;
  user_id: number;
  full_name: string;
  relationship: 'Cónyuge' | 'Hijo/a';
  ci?: string;
  birth_date?: string;
  created_at: string;
  updated_at: string;
}

export interface Request {
  id: number;
  user_id: number;
  type: string;
  category: 'Gestión Laboral' | 'Bienestar' | 'Desarrollo';
  details?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  file_url?: string;
  rating?: number;
  resolved_by_id?: number;
  created_at: string;
  updated_at: string;
}

export interface Complaint {
  id: number;
  user_id: number;
  category: string;
  details: string;
  status: string;
  is_anonymous: boolean;
  created_at: string;
  updated_at: string;
}

export interface AssetCategory {
  id: number;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface Asset {
  id: number;
  asset_code: string;
  name: string;
  description?: string;
  category_id: number;
  brand?: string;
  model?: string;
  serial_number?: string;
  purchase_date?: string;
  purchase_cost?: number;
  status: 'AVAILABLE' | 'ASSIGNED' | 'MAINTENANCE' | 'RETIRED';
  condition_status: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
  location?: string;
  assigned_to_id?: number;
  assigned_date?: string;
  warranty_expiry_date?: string;
  notes?: string;
  photo_url?: string;
  invoice_url?: string;
  created_at: string;
  updated_at: string;
}

export interface AssetAssignment {
  id: number;
  asset_id: number;
  user_id: number;
  assigned_by_id: number;
  assigned_date: string;
  return_date?: string;
  status: 'ACTIVE' | 'RETURNED';
  assignment_notes?: string;
  return_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface AssetMaintenance {
  id: number;
  asset_id: number;
  maintenance_type: string;
  description: string;
  maintenance_date: string;
  cost?: number;
  performed_by?: string;
  next_maintenance_date?: string;
  status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';
  notes?: string;
  created_by_id: number;
  created_at: string;
  updated_at: string;
  assignment_id?: number;
}

export interface CorporateEvent {
  id: number;
  title: string;
  description?: string;
  start_date: string;
  end_date: string;
  start_time?: string;
  location?: string;
  category: string;
  target_audience?: string;
  created_by_id: number;
  created_at: string;
  updated_at: string;
}

export interface EventRsvp {
  id: number;
  event_id: number;
  user_id: number;
  status: 'ATTENDING' | 'NOT_ATTENDING' | 'MAYBE';
  created_at: string;
  updated_at: string;
}

export interface EvaluationCycle {
  id: number;
  title: string;
  description?: string;
  start_date: string;
  end_date: string;
  department?: string;
  status: 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  created_by_id: number;
  created_at: string;
  updated_at: string;
}

export interface Evaluation {
  id: number;
  cycle_id: number;
  employee_id: number;
  evaluator_id: number;
  self_score?: number | null;
  manager_score?: number | null;
  final_score?: number | null;
  self_comments?: string;
  manager_comments?: string;
  status: 'PENDING' | 'SELF_COMPLETED' | 'MANAGER_EVALUATION_PENDING' | 'MANAGER_COMPLETED' | 'COMPLETED';
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Loan {
  id: number;
  user_id: number;
  principal_amount: number;
  interest_rate: number;
  status: 'ACTIVE' | 'PAID_OFF' | 'CANCELLED';
  issue_date: string;
  category: string;
  monthly_installment: number;
  total_installments: number;
  remaining_installments: number;
  created_at: string;
  updated_at: string;
}

export interface LoanInstallment {
  id: number;
  loan_id: number;
  installment_number: number;
  due_date: string;
  amount_due: number;
  amount_paid: number;
  status: 'PENDING' | 'PAID' | 'OVERDUE' | 'PARTIALLY_PAID';
  balance: number;
  created_at: string;
  updated_at: string;
}

export interface LoanPayment {
  id: number;
  loan_id: number;
  installment_id: number;
  amount_paid: number;
  payment_date: string;
  payment_method: 'PAYROLL' | 'TRANSFER' | 'CASH';
  reference?: string;
  recorded_by_id: number;
  created_at: string;
  updated_at: string;
}

export interface LoanRepaymentPlan {
  id: number;
  loan_id: number;
  method: 'FIXED_AMOUNT' | 'FIXED_INSTALLMENTS' | 'SALARY_PERCENTAGE';
  value: number;
  frequency: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';
  start_date: string;
  created_at: string;
  updated_at: string;
}

export interface Company {
  id: number;
  name: string;
  short_name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface EmployeeAuditLog {
  id: number;
  employee_id: number;
  employee_ci: string;
  employee_name: string;
  employee_email: string;
  action_type: 'INACTIVATED' | 'DELETED' | 'ACTIVATED';
  reason?: string;
  performed_by_id: number;
  performed_by_name: string;
  performed_at: string;
  employee_data_snapshot?: string;
  created_at: string;
}

export interface Candidate {
  id: number;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  position: string;
  department?: string;
  status: 'APPLIED' | 'PHONE_SCREEN' | 'INTERVIEW' | 'OFFER' | 'HIRED' | 'REJECTED';
  resume_url?: string;
  cover_letter_url?: string;
  resume_text?: string;
  resume_pdf_base64?: string;
  ai_profile?: string;
  application_date: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Interview {
  id: number;
  candidate_id: number;
  type: 'Filtro Telefónico' | 'Técnica' | 'RRHH' | 'Final' | 'Seguimiento';
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'RESCHEDULED';
  date: string;
  time: string;
  duration_minutes: number;
  interviewer: string;
  location?: string;
  meeting_link?: string;
  notes?: string;
  feedback?: string;
  rating?: number;
  created_at: string;
  updated_at: string;
}

export interface AssetIncident {
  id: number;
  asset_id: number;
  assignment_id?: number;
  incident_type: string;
  description: string;
  incident_date: string;
  reported_by_id: number;
  resolution?: string;
  resolved_date?: string;
  cost?: number;
  severity: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Conversation {
  id: number;
  created_at: string;
  updated_at: string;
}

export interface ConversationParticipant {
  id: number;
  conversation_id: number;
  user_id: number;
  created_at: string;
}

export interface Message {
  id: number;
  conversation_id: number;
  sender_id: number;
  text: string;
  is_broadcast: boolean;
  poll_id?: number;
  created_at: string;
  updated_at: string;
}

export interface Poll {
  id: number;
  question: string;
  options: string[];
  votes: Record<string, number>;
  voters: Record<string, number>;
  created_at: string;
  updated_at: string;
}

export interface Document {
  id: number;
  title: string;
  description?: string;
  category: string;
  department?: string;
  is_public: boolean;
  file_url: string;
  uploaded_by_id: number;
  created_at: string;
  updated_at: string;
}

// Additional types for components
export interface CandidateWithInterviews extends Candidate {
  interviews: Interview[];
}

export type CandidateStatus = 'APPLIED' | 'PHONE_SCREEN' | 'INTERVIEW' | 'OFFER' | 'HIRED' | 'REJECTED';

export type InterviewType = 'Filtro Telefónico' | 'Técnica' | 'RRHH' | 'Final' | 'Seguimiento';

export type InterviewStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'RESCHEDULED';

export type RepaymentMethod = 'FIXED_AMOUNT' | 'FIXED_INSTALLMENTS' | 'SALARY_PERCENTAGE';

export type PaymentFrequency = 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';

export type LoanPaymentMethod = 'PAYROLL' | 'TRANSFER' | 'CASH';

export interface ConversationWithMessages {
  id: number;
  participants: number[];
  messages: Message[];
  last_message: Message | null;
  other_participant: {
    id: number;
    first_name: string;
    last_name: string;
    department?: string;
    position?: string;
  } | null;
  created_at: string;
  updated_at: string;
}
