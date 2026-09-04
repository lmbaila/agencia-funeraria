import { useSearchParams, useNavigate } from 'react-router-dom';
import { RegistrationWizard } from '@/components/registration/RegistrationWizard';
import { PublicApi } from '@/api/endpoints';

export default function RegisterPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  return (
    <RegistrationWizard
      eyebrow="Adesão Online"
      title="Formulário de Adesão"
      description="Preencha os seus dados para aderir a um Plano de Assistência Funerária da Agência Funerária Espírito Santo."
      submitLabel="Concluir e Gerar Credenciais"
      initialPlanId={params.get('plano') ?? undefined}
      onSubmit={PublicApi.register}
      onSuccess={(result) => navigate('/adesao/sucesso', { state: result })}
      errorFallback="Não foi possível concluir a adesão."
    />
  );
}
