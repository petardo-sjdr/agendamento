// ============================================================
// PETARDO - TypeScript Types
// ============================================================

export interface Service {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon_name: string;
  explanation_title: string | null;
  explanation_text: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type FieldType = 'text' | 'number' | 'select' | 'checkbox' | 'radio' | 'textarea' | 'phone' | 'email';
export type AppliesTo = 'residential' | 'commercial' | 'both';

export interface ServiceField {
  id: string;
  service_id: string;
  field_label: string;
  field_key: string;
  field_type: FieldType;
  field_options: string[];
  placeholder: string | null;
  helper_text: string | null;
  is_required: boolean;
  display_order: number;
  applies_to: AppliesTo;
  created_at: string;
  updated_at: string;
}

export type CustomerType = 'residential' | 'commercial';

export interface PricingRule {
  id: string;
  service_id: string;
  customer_type: CustomerType | 'both';
  rule_name: string;
  rule_description: string | null;
  rule_logic: Record<string, unknown>;
  base_price: number;
  priority: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  document: string | null;
  address: string | null;
  city: string | null;
  neighborhood: string | null;
  complement: string | null;
  zip_code: string | null;
  customer_type: CustomerType;
  company_name: string | null;
  source: string;
  created_at: string;
  updated_at: string;
}

export type QuoteStatus = 'pending' | 'approved' | 'rejected' | 'expired';

export interface Quote {
  id: string;
  customer_id: string | null;
  service_id: string;
  customer_type: CustomerType;
  form_data: Record<string, unknown>;
  calculated_price: number | null;
  discount: number;
  final_price: number | null;
  price_breakdown: Array<{ label: string; value: number }>;
  status: QuoteStatus;
  token: string;
  notes: string | null;
  expires_at: string;
  created_at: string;
  updated_at: string;
  // Joined fields
  service?: Service;
  customer?: Customer;
}

export type AppointmentStatus = 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';

export interface Appointment {
  id: string;
  quote_id: string | null;
  customer_id: string;
  service_id: string;
  scheduled_date: string;
  scheduled_time_start: string;
  scheduled_time_end: string;
  status: AppointmentStatus;
  team_assigned: string | null;
  notes: string | null;
  reminder_24h_sent: boolean;
  reminder_2h_sent: boolean;
  review_sent: boolean;
  followup_sent: boolean;
  created_at: string;
  updated_at: string;
  // Joined fields
  service?: Service;
  customer?: Customer;
  quote?: Quote;
}

export interface AvailableSlot {
  id: string;
  date: string;
  time_start: string;
  time_end: string;
  service_id: string | null;
  max_appointments: number;
  current_count: number;
  is_blocked: boolean;
  created_at: string;
}

export interface WeeklySchedule {
  id: string;
  day_of_week: number;
  time_start: string;
  time_end: string;
  max_appointments: number;
  is_active: boolean;
  created_at: string;
}

export interface Review {
  id: string;
  appointment_id: string;
  customer_id: string;
  rating: number;
  comment: string | null;
  token: string;
  created_at: string;
  // Joined fields
  customer?: Customer;
  appointment?: Appointment;
}

export type NotificationType =
  | 'quote_ready'
  | 'appointment_confirmed'
  | 'reminder_24h'
  | 'reminder_2h'
  | 'review_request'
  | 'followup_6m'
  | 'quote_approved'
  | 'quote_rejected';

export interface NotificationTemplate {
  id: string;
  type: NotificationType;
  template_name: string;
  template_text: string;
  variables_available: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface NotificationLog {
  id: string;
  customer_id: string | null;
  appointment_id: string | null;
  template_type: string;
  phone: string;
  message_sent: string | null;
  status: 'pending' | 'sent' | 'failed' | 'delivered';
  error_message: string | null;
  sent_at: string | null;
  created_at: string;
}

export interface AdminSetting {
  id: string;
  key: string;
  value: Record<string, unknown>;
  description: string | null;
  updated_at: string;
}

// Lucide icon name mapping
export const SERVICE_ICONS: Record<string, string> = {
  'Wrench': 'Wrench',
  'Bug': 'Bug',
  'Droplets': 'Droplets',
  'Droplet': 'Droplet',
  'Flame': 'Flame',
  'MousePointer': 'MousePointer',
  'Hexagon': 'Hexagon',
  'Bird': 'Bird',
  'Moon': 'Moon',
  'Layers': 'Layers',
  'CloudRain': 'CloudRain',
  'Shield': 'Shield',
  'Zap': 'Zap',
  'Thermometer': 'Thermometer',
  'Leaf': 'Leaf',
  'Home': 'Home',
  'Building2': 'Building2',
  'Truck': 'Truck',
  'Spray': 'Spray',
};
