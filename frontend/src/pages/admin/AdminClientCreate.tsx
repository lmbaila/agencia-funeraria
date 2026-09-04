import { useNavigate } from 'react-router-dom';
import { RegistrationWizard } from '@/components/registration/RegistrationWizard';
import { ClientsApi } from '@/api/endpoints';
import { useToast } from '@/components/ui/Toast';

export default function AdminClientCreate() {
  const navigate = useNavigate();
  const { push } = useToast();

  return (
    <RegistrationWizard
      title="Registo de Cliente"
      compact
      submitLabel="Registar Cliente e Gerar Credenciais"
      onSubmit={ClientsApi.create}
      onSuccess={(result) => {
        push('success', `Cliente registado com sucesso. Utilizador: ${result.credentials.identifier}`);
        navigate(`/admin/clientes/${result.client.id}`);
      }}
      errorFallback="Não foi possível registar o cliente."
    />
  );
}
