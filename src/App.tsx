import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import AdminLayout from './components/admin/AdminLayout';
import DashboardHome from './pages/admin/DashboardHome';
import ServicesAdmin from './pages/admin/ServicesAdmin';
import FieldsAdmin from './pages/admin/FieldsAdmin';
import PricingAdmin from './pages/admin/PricingAdmin';
import QuotesAdmin from './pages/admin/QuotesAdmin';
import AppointmentsAdmin from './pages/admin/AppointmentsAdmin';
import CustomersAdmin from './pages/admin/CustomersAdmin';
import SlotsAdmin from './pages/admin/SlotsAdmin';
import TemplatesAdmin from './pages/admin/TemplatesAdmin';
import ReviewsAdmin from './pages/admin/ReviewsAdmin';
import SettingsAdmin from './pages/admin/SettingsAdmin';
import QuotePage from './pages/public/QuotePage';
import SchedulePage from './pages/public/SchedulePage';
import ReviewPage from './pages/public/ReviewPage';

function App() {
  return (
    <Router>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Login />} />
        <Route path="/orcamento/:token" element={<QuotePage />} />
        <Route path="/agendar/:quoteId" element={<SchedulePage />} />
        <Route path="/avaliar/:token" element={<ReviewPage />} />

        {/* Admin routes */}
        <Route path="/dashboard" element={<AdminLayout />}>
          <Route index element={<DashboardHome />} />
          <Route path="servicos" element={<ServicesAdmin />} />
          <Route path="servicos/:serviceId/campos" element={<FieldsAdmin />} />
          <Route path="servicos/:serviceId/precos" element={<PricingAdmin />} />
          <Route path="orcamentos" element={<QuotesAdmin />} />
          <Route path="agendamentos" element={<AppointmentsAdmin />} />
          <Route path="clientes" element={<CustomersAdmin />} />
          <Route path="horarios" element={<SlotsAdmin />} />
          <Route path="templates" element={<TemplatesAdmin />} />
          <Route path="avaliacoes" element={<ReviewsAdmin />} />
          <Route path="configuracoes" element={<SettingsAdmin />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
