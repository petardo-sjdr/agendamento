import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Users, Trash2 } from 'lucide-react';
import './CustomersAdmin.css';

export default function CustomersAdmin() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading customers:', error);
    } else {
      setCustomers(data || []);
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este cliente? Todos os orçamentos e agendamentos vinculados a ele podem ser afetados.')) return;
    const { error } = await supabase.from('customers').delete().eq('id', id);
    if (!error) {
      setCustomers(prev => prev.filter(c => c.id !== id));
    } else {
      alert('Não foi possível excluir o cliente pois ele possui orçamentos ou agendamentos atrelados. Exclua as dependências primeiro.');
    }
  };

  return (
    <div className="customers-admin">
      <div className="page-title">
        <div>
          <h1>Clientes</h1>
          <p>Base de clientes da PETARDO</p>
        </div>
      </div>

      <div className="customers-list glass-panel">
        {loading ? (
          <div className="customers-empty">Carregando...</div>
        ) : customers.length === 0 ? (
          <div className="customers-empty">
            <Users size={48} />
            <p>Nenhum cliente cadastrado.</p>
          </div>
        ) : (
          <table className="customers-table">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Contato</th>
                <th>Endereço</th>
                <th>Tipo</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {customers.map(c => (
                <tr key={c.id}>
                  <td>
                    <div className="cust-name">{c.name}</div>
                    <div className="cust-detail">{c.cpf_cnpj || c.document || '-'}</div>
                  </td>
                  <td>
                    <div className="cust-detail">{c.phone}</div>
                    <div className="cust-detail">{c.email || '-'}</div>
                  </td>
                  <td>
                    {c.endereco_rua || c.address ? (
                      <>
                        <div className="cust-detail">
                          {c.endereco_rua || c.address}, {c.endereco_numero}
                        </div>
                        <div className="cust-detail" style={{ fontSize: '0.7rem' }}>
                          {c.endereco_bairro || c.neighborhood} - {c.endereco_cidade || c.city}
                        </div>
                      </>
                    ) : (
                      <span className="cust-detail">-</span>
                    )}
                  </td>
                  <td>
                    <span className="cust-type">
                      {c.customer_type === 'residential' ? 'Residencial' : 'Comercial'}
                    </span>
                  </td>
                  <td>
                    <div className="cust-actions">
                      <button
                        className="icon-btn icon-btn-danger"
                        title="Excluir"
                        onClick={() => handleDelete(c.id)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
