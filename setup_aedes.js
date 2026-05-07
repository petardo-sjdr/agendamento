import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pwozjqwgieqjpatzwids.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB3b3pqcXdnaWVxanBhdHp3aWRzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODAwMDcyOCwiZXhwIjoyMDkzNTc2NzI4fQ.Q8pba4pV5V3051GQhgBsw5dxQ0Lic4ZcZXE022Y4Q1I';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const svcId = '6890abbe-1d41-4a93-bb6d-792aab1efb2e'; // Aedes do Bem

  await supabase.from('service_fields').delete().eq('service_id', svcId);
  await supabase.from('pricing_rules').delete().eq('service_id', svcId);

  const fields = [
    {
      service_id: svcId,
      field_label: 'Você representa uma...',
      field_key: 'tipo_cliente_aedes',
      field_type: 'radio',
      field_options: [
        { label: 'Empresa / Indústria' },
        { label: 'Condomínio' },
        { label: 'Prefeitura / Órgão Público' },
        { label: 'Escola / Instituição de Ensino' },
        { label: 'Hotel / Pousada' },
        { label: 'Residência' }
      ],
      placeholder: '',
      helper_text: 'O programa é ideal para áreas com grande circulação de pessoas.',
      is_required: true,
      display_order: 1,
      applies_to: 'both'
    },
    {
      service_id: svcId,
      field_label: 'Qual a cidade e bairro?',
      field_key: 'localizacao_aedes',
      field_type: 'text',
      field_options: [],
      placeholder: 'Ex: São João Del Rei - Centro',
      helper_text: '',
      is_required: true,
      display_order: 2,
      applies_to: 'both'
    },
    {
      service_id: svcId,
      field_label: 'Qual o tamanho aproximado da área?',
      field_key: 'tamanho_area',
      field_type: 'text',
      field_options: [],
      placeholder: 'Ex: 2000m², 5 blocos, 120 casas',
      helper_text: 'Pode ser em m², número de blocos, apartamentos ou casas.',
      is_required: true,
      display_order: 3,
      applies_to: 'both'
    },
    {
      service_id: svcId,
      field_label: 'Houve casos de dengue confirmados recentemente na região?',
      field_key: 'historico_dengue',
      field_type: 'radio',
      field_options: [
        { label: 'Sim, houve casos confirmados' },
        { label: 'Não, mas queremos prevenir' }
      ],
      placeholder: '',
      helper_text: '',
      is_required: true,
      display_order: 4,
      applies_to: 'both'
    },
    {
      service_id: svcId,
      field_label: 'Qual o seu objetivo principal?',
      field_key: 'objetivo_programa',
      field_type: 'radio',
      field_options: [
        { label: 'Prevenção Contínua (Programa Aedes do Bem)' },
        { label: 'Ação de Choque Imediata (surto ativo)' }
      ],
      placeholder: '',
      helper_text: 'A prevenção contínua inclui instalação + monitoramento mensal.',
      is_required: true,
      display_order: 5,
      applies_to: 'both'
    },
    {
      service_id: svcId,
      field_label: 'Gostaria de incluir o controle de outras pragas no pacote?',
      field_key: 'escopo_pacote',
      field_type: 'radio',
      field_options: [
        { label: 'Apenas Aedes (Dengue, Zika, Chikungunya)' },
        { label: 'Pacote Completo (Aedes + outras pragas)' }
      ],
      placeholder: '',
      helper_text: '',
      is_required: true,
      display_order: 6,
      applies_to: 'both'
    }
  ];

  const { error } = await supabase.from('service_fields').insert(fields);
  if (error) console.error('Error:', error);
  else console.log('✅ Aedes do Bem fields created!');
}
run();
