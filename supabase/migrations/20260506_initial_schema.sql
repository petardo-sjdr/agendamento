-- ============================================================
-- PETARDO - Sistema de Agendamento e Orçamento
-- Migration: Initial Schema
-- Date: 2026-05-06
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. SERVICES - Catálogo de serviços
-- ============================================================
CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  icon_name TEXT DEFAULT 'Bug',
  explanation_title TEXT,
  explanation_text TEXT,
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 2. SERVICE_FIELDS - Campos dinâmicos por serviço
-- ============================================================
CREATE TABLE IF NOT EXISTS service_fields (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  field_label TEXT NOT NULL,
  field_key TEXT NOT NULL,
  field_type TEXT NOT NULL CHECK (field_type IN ('text', 'number', 'select', 'checkbox', 'radio', 'textarea', 'phone', 'email')),
  field_options JSONB DEFAULT '[]'::jsonb,
  placeholder TEXT,
  helper_text TEXT,
  is_required BOOLEAN DEFAULT false,
  display_order INT DEFAULT 0,
  applies_to TEXT NOT NULL DEFAULT 'both' CHECK (applies_to IN ('residential', 'commercial', 'both')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 3. PRICING_RULES - Regras de precificação
-- ============================================================
CREATE TABLE IF NOT EXISTS pricing_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  customer_type TEXT NOT NULL CHECK (customer_type IN ('residential', 'commercial', 'both')),
  rule_name TEXT NOT NULL,
  rule_description TEXT,
  rule_logic JSONB NOT NULL DEFAULT '{}'::jsonb,
  base_price NUMERIC(10,2) DEFAULT 0,
  priority INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 4. CUSTOMERS - Dados dos clientes
-- ============================================================
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  document TEXT,
  address TEXT,
  city TEXT,
  neighborhood TEXT,
  complement TEXT,
  zip_code TEXT,
  customer_type TEXT NOT NULL DEFAULT 'residential' CHECK (customer_type IN ('residential', 'commercial')),
  company_name TEXT,
  source TEXT DEFAULT 'whatsapp',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 5. QUOTES - Orçamentos gerados
-- ============================================================
CREATE TABLE IF NOT EXISTS quotes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE RESTRICT,
  customer_type TEXT NOT NULL CHECK (customer_type IN ('residential', 'commercial')),
  form_data JSONB DEFAULT '{}'::jsonb,
  calculated_price NUMERIC(10,2),
  discount NUMERIC(10,2) DEFAULT 0,
  final_price NUMERIC(10,2),
  price_breakdown JSONB DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
  token UUID NOT NULL DEFAULT uuid_generate_v4() UNIQUE,
  notes TEXT,
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 6. APPOINTMENTS - Agendamentos
-- ============================================================
CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quote_id UUID REFERENCES quotes(id) ON DELETE SET NULL,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE RESTRICT,
  scheduled_date DATE NOT NULL,
  scheduled_time_start TIME NOT NULL,
  scheduled_time_end TIME NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show')),
  team_assigned TEXT,
  notes TEXT,
  reminder_24h_sent BOOLEAN DEFAULT false,
  reminder_2h_sent BOOLEAN DEFAULT false,
  review_sent BOOLEAN DEFAULT false,
  followup_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 7. AVAILABLE_SLOTS - Horários disponíveis
-- ============================================================
CREATE TABLE IF NOT EXISTS available_slots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL,
  time_start TIME NOT NULL,
  time_end TIME NOT NULL,
  service_id UUID REFERENCES services(id) ON DELETE CASCADE,
  max_appointments INT DEFAULT 1,
  current_count INT DEFAULT 0,
  is_blocked BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 8. WEEKLY_SCHEDULE - Horários recorrentes por dia da semana
-- ============================================================
CREATE TABLE IF NOT EXISTS weekly_schedule (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  time_start TIME NOT NULL,
  time_end TIME NOT NULL,
  max_appointments INT DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 9. REVIEWS - Avaliações dos clientes
-- ============================================================
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  token UUID NOT NULL DEFAULT uuid_generate_v4() UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 10. NOTIFICATION_TEMPLATES - Templates de notificações
-- ============================================================
CREATE TABLE IF NOT EXISTS notification_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL UNIQUE CHECK (type IN (
    'quote_ready', 'appointment_confirmed',
    'reminder_24h', 'reminder_2h',
    'review_request', 'followup_6m',
    'quote_approved', 'quote_rejected'
  )),
  template_name TEXT NOT NULL,
  template_text TEXT NOT NULL,
  variables_available JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 11. NOTIFICATION_LOG - Log de notificações enviadas
-- ============================================================
CREATE TABLE IF NOT EXISTS notification_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  template_type TEXT NOT NULL,
  phone TEXT NOT NULL,
  message_sent TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'delivered')),
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 12. ADMIN_SETTINGS - Configurações gerais
-- ============================================================
CREATE TABLE IF NOT EXISTS admin_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_service_fields_service ON service_fields(service_id);
CREATE INDEX idx_pricing_rules_service ON pricing_rules(service_id);
CREATE INDEX idx_quotes_token ON quotes(token);
CREATE INDEX idx_quotes_customer ON quotes(customer_id);
CREATE INDEX idx_quotes_status ON quotes(status);
CREATE INDEX idx_appointments_date ON appointments(scheduled_date);
CREATE INDEX idx_appointments_customer ON appointments(customer_id);
CREATE INDEX idx_appointments_status ON appointments(status);
CREATE INDEX idx_available_slots_date ON available_slots(date);
CREATE INDEX idx_reviews_appointment ON reviews(appointment_id);
CREATE INDEX idx_notification_log_customer ON notification_log(customer_id);
CREATE INDEX idx_customers_phone ON customers(phone);

-- ============================================================
-- SEED: Default notification templates
-- ============================================================
INSERT INTO notification_templates (type, template_name, template_text, variables_available) VALUES
('quote_ready', 'Orçamento Pronto', 'Olá {{nome}}! Seu orçamento para {{servico}} está pronto. Valor: R$ {{valor}}. Acesse: {{link}}', '["nome", "servico", "valor", "link"]'::jsonb),
('appointment_confirmed', 'Agendamento Confirmado', 'Olá {{nome}}! Seu serviço de {{servico}} foi agendado para {{data}} às {{hora}}. Endereço: {{endereco}}. Equipe PETARDO agradece!', '["nome", "servico", "data", "hora", "endereco"]'::jsonb),
('reminder_24h', 'Lembrete 24h', 'Olá {{nome}}! Amanhã ({{data}}) às {{hora}} nossa equipe realizará o serviço de {{servico}} no endereço {{endereco}}. Confirma? Responda SIM ou NÃO.', '["nome", "servico", "data", "hora", "endereco"]'::jsonb),
('reminder_2h', 'Lembrete 2h', 'Olá {{nome}}! Em 2 horas nossa equipe chegará para realizar o serviço de {{servico}}. Por favor, certifique-se de que o local esteja acessível.', '["nome", "servico"]'::jsonb),
('review_request', 'Solicitação de Avaliação', 'Olá {{nome}}! O serviço de {{servico}} foi realizado ontem. Gostaríamos da sua avaliação! Acesse: {{link}}', '["nome", "servico", "link"]'::jsonb),
('followup_6m', 'Recontato 6 Meses', 'Olá {{nome}}! Faz 6 meses que realizamos o serviço de {{servico}}. Como está tudo? Precisa de algo? Fale conosco!', '["nome", "servico"]'::jsonb),
('quote_approved', 'Orçamento Aprovado', 'Ótimo {{nome}}! Seu orçamento foi aprovado. Agora escolha a melhor data para agendamento: {{link}}', '["nome", "link"]'::jsonb),
('quote_rejected', 'Orçamento Recusado', 'Olá {{nome}}! Entendemos que o orçamento não atendeu. Podemos conversar? Entre em contato pelo WhatsApp.', '["nome"]'::jsonb)
ON CONFLICT (type) DO NOTHING;

-- ============================================================
-- SEED: Default admin settings
-- ============================================================
INSERT INTO admin_settings (key, value, description) VALUES
('company_info', '{"name": "PETARDO Imunizadora", "phone": "", "email": "", "address": "", "city": "São João del-Rei", "state": "MG"}'::jsonb, 'Informações da empresa'),
('botconversa_config', '{"api_key": "", "webhook_url": "", "is_active": false}'::jsonb, 'Configuração do BotConversa'),
('booking_config', '{"advance_days": 30, "min_notice_hours": 24, "slot_duration_minutes": 60}'::jsonb, 'Configurações de agendamento')
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- SEED: Initial services catalog
-- ============================================================
INSERT INTO services (name, slug, description, icon_name, explanation_title, explanation_text, display_order) VALUES
('Desentupimento', 'desentupimento', 'Serviço profissional de desentupimento de pias, ralos, vasos sanitários e tubulações.', 'Wrench', 'Desentupimento Profissional', 'Nosso serviço de desentupimento utiliza equipamentos modernos para resolver obstruções em pias, ralos, vasos sanitários e tubulações em geral. Preencha os dados abaixo para que possamos calcular seu orçamento.', 1),
('Dedetização', 'dedetizacao', 'Controle profissional de pragas urbanas com produtos certificados.', 'Bug', 'Dedetização Profissional', 'A dedetização é o controle de pragas urbanas como baratas, formigas, escorpiões e outros insetos. Utilizamos produtos certificados pela ANVISA. Preencha os dados para seu orçamento.', 2),
('Caça Vazamentos', 'caca-vazamentos', 'Detecção e localização precisa de vazamentos com equipamentos especializados.', 'Droplets', 'Caça Vazamentos', 'Utilizamos equipamentos de última geração para detectar e localizar vazamentos em tubulações, lajes e paredes sem quebrar. Preencha os dados para seu orçamento.', 3),
('Higienização de Caixa D''água', 'higienizacao-caixa-dagua', 'Limpeza e desinfecção profissional de caixas d''água e reservatórios.', 'Droplet', 'Higienização de Caixa D''água', 'A higienização da caixa d''água é essencial para garantir a qualidade da água consumida. Recomendada a cada 6 meses. Preencha os dados para seu orçamento.', 4),
('Higienização de Gordura', 'higienizacao-gordura', 'Limpeza profissional de caixas de gordura residenciais e comerciais.', 'Flame', 'Higienização de Caixa de Gordura', 'A limpeza da caixa de gordura previne entupimentos e mau cheiro. Recomendada a cada 3-6 meses. Preencha os dados para seu orçamento.', 5),
('Desratização', 'desratizacao', 'Controle profissional de roedores com métodos seguros e eficazes.', 'MousePointer', 'Desratização Profissional', 'O controle de roedores é fundamental para a saúde e segurança do ambiente. Utilizamos métodos seguros e eficazes. Preencha os dados para seu orçamento.', 6),
('Combate a Abelha', 'combate-abelha', 'Remoção segura e realocação de colmeias por profissionais especializados.', 'Hexagon', 'Combate a Abelhas', 'Realizamos a remoção segura de colmeias e enxames. Nossa equipe é treinada para realizar o manejo adequado das abelhas. Preencha os dados para seu orçamento.', 7),
('Combate a Pombo', 'combate-pombo', 'Afugentamento e controle de pombos com métodos humanitários.', 'Bird', 'Combate a Pombos', 'Pombos podem transmitir doenças e causar danos estruturais. Utilizamos métodos humanitários de afugentamento. Preencha os dados para seu orçamento.', 8),
('Combate a Morcego', 'combate-morcego', 'Manejo e afugentamento de morcegos seguindo normas ambientais.', 'Moon', 'Combate a Morcegos', 'Morcegos são animais protegidos por lei. Realizamos o manejo seguindo todas as normas ambientais. Preencha os dados para seu orçamento.', 9),
('Limpeza de Forro', 'limpeza-forro', 'Limpeza profissional de forros com remoção de sujidades e tratamento.', 'Layers', 'Limpeza de Forro', 'A limpeza de forro remove poeira, teias de aranha e outros acúmulos. Essencial para ambientes limpos e saudáveis. Preencha os dados para seu orçamento.', 10),
('Limpeza de Calha', 'limpeza-calha', 'Desobstrução e limpeza de calhas e condutores pluviais.', 'CloudRain', 'Limpeza de Calha', 'Calhas obstruídas podem causar infiltrações e danos estruturais. Realizamos a limpeza completa e desobstrução. Preencha os dados para seu orçamento.', 11),
('Aedes do Bem', 'aedes-do-bem', 'Programa de prevenção ao Aedes Aegypti com dedetização e orientação.', 'Shield', 'Aedes do Bem - Prevenção ao Aedes Aegypti', 'Nosso programa Aedes do Bem combina dedetização focada no mosquito Aedes Aegypti com orientação sobre prevenção. Preencha os dados para seu orçamento.', 12);

-- ============================================================
-- RLS Policies
-- ============================================================
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE available_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;

-- Public read on services (for the customer-facing form)
CREATE POLICY "Services are viewable by everyone" ON services FOR SELECT USING (true);
CREATE POLICY "Service fields are viewable by everyone" ON service_fields FOR SELECT USING (true);

-- Public read on available_slots (for booking)
CREATE POLICY "Available slots are viewable by everyone" ON available_slots FOR SELECT USING (true);

-- Public insert on quotes (customer submitting a quote)
CREATE POLICY "Anyone can create a quote" ON quotes FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can view their quote by token" ON quotes FOR SELECT USING (true);
CREATE POLICY "Anyone can update quote status" ON quotes FOR UPDATE USING (true);

-- Public insert on customers
CREATE POLICY "Anyone can create a customer" ON customers FOR INSERT WITH CHECK (true);
CREATE POLICY "Customers viewable by all" ON customers FOR SELECT USING (true);

-- Public insert on reviews (by token)
CREATE POLICY "Anyone can create a review" ON reviews FOR INSERT WITH CHECK (true);
CREATE POLICY "Reviews are viewable by everyone" ON reviews FOR SELECT USING (true);

-- Appointments: public read for scheduling
CREATE POLICY "Appointments viewable by all" ON appointments FOR SELECT USING (true);
CREATE POLICY "Anyone can create an appointment" ON appointments FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update appointments" ON appointments FOR UPDATE USING (true);

-- Admin-only tables: full access for authenticated users
CREATE POLICY "Admin full access to pricing_rules" ON pricing_rules FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admin full access to weekly_schedule" ON weekly_schedule FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admin full access to notification_templates" ON notification_templates FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admin full access to notification_log" ON notification_log FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admin full access to admin_settings" ON admin_settings FOR ALL USING (auth.role() = 'authenticated');

-- Admin write access to services and fields
CREATE POLICY "Admin can modify services" ON services FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admin can modify service_fields" ON service_fields FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admin can modify available_slots" ON available_slots FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admin can modify customers" ON customers FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admin can modify quotes" ON quotes FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admin can modify appointments" ON appointments FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admin can modify reviews" ON reviews FOR ALL USING (auth.role() = 'authenticated');

-- ============================================================
-- FUNCTIONS: Updated_at trigger
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON services FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_service_fields_updated_at BEFORE UPDATE ON service_fields FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_pricing_rules_updated_at BEFORE UPDATE ON pricing_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_quotes_updated_at BEFORE UPDATE ON quotes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON appointments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_notification_templates_updated_at BEFORE UPDATE ON notification_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
