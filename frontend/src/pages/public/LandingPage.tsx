import { Link } from 'react-router-dom';
import { ShieldCheck, Truck, FileText, Users, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { GrainOverlay, CandleFlame } from '@/components/ui/DecorativeArt';
import { Reveal } from '@/components/ui/Reveal';

const PROMISES = [
  { icon: ShieldCheck, label: 'Cobertura em todo o território nacional' },
  { icon: Truck, label: 'Remoção, cortejo e translado incluídos' },
  { icon: FileText, label: 'Documentação e registo de óbito' },
  { icon: Users, label: 'Inclusão de dependentes e familiares' },
];

const STEPS = [
  { title: 'Preencha a adesão', text: 'Os seus dados e os dos dependentes, online, em poucos minutos.' },
  { title: 'Pague a taxa de adesão', text: '10% do valor do plano, via M-Pesa ou E-Mola.' },
  { title: 'Receba as suas credenciais', text: 'Utilizador e password de acesso ao Portal do Cliente.' },
  { title: 'Acompanhe sempre', text: 'Mensalidades e cobertura, a qualquer momento, a partir do Portal.' },
];

export default function LandingPage() {
  return (
    <div className="font-body">
      {/* Hero */}
      <section className="relative overflow-hidden bg-[#16211E] pb-28 pt-24 text-[#F4EDE3]">
        <GrainOverlay className="pointer-events-none absolute inset-0 h-full w-full" />
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse 40% 45% at 50% 10%, rgba(227,168,87,0.16), transparent 65%)',
          }}
        />

        <div className="relative mx-auto flex max-w-2xl flex-col items-center px-4 text-center">
          <CandleFlame className="mb-7 h-14 w-12" />
          <p className="font-plex text-xs font-medium uppercase tracking-[0.3em] text-[#E3A857]">
            Assistência Funerária · Moçambique
          </p>
          <h1 className="font-display mt-6 text-[2.5rem] font-medium leading-[1.15] tracking-tight md:text-[3.4rem]">
            Um cuidado que continua depois de si.
          </h1>
          <p className="font-display mx-auto mt-6 max-w-lg text-base italic leading-relaxed text-[#CFC3B2] md:text-lg">
            Planos de assistência funerária com cobertura em todo o território moçambicano, para que a sua família
            nunca enfrente este momento sozinha.
          </p>
          <Link to="/adesao" className="mt-10">
            <Button size="lg" className="rounded-full bg-[#E3A857] px-8 text-[#1B140D] hover:bg-[#EDBB77]">
              Aderir a um Plano <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* A Nossa Promessa */}
      <section className="bg-[#16211E] pb-24">
        <Reveal className="mx-auto max-w-5xl px-4">
          <div className="grid gap-x-8 gap-y-10 border-t border-[#E3A857]/15 pt-10 sm:grid-cols-2 lg:grid-cols-4 lg:divide-x lg:divide-[#E3A857]/15">
            {PROMISES.map((item) => (
              <div key={item.label} className="flex flex-col gap-3 lg:pl-8 lg:first:pl-0">
                <item.icon className="h-5 w-5 text-[#E3A857]" />
                <p className="text-sm leading-relaxed text-[#CFC3B2]">{item.label}</p>
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      {/* Como Funciona */}
      <section id="caminho" className="bg-[#EDE3D6] py-24">
        <div className="mx-auto max-w-2xl px-4">
          <p className="font-plex text-xs font-medium uppercase tracking-[0.3em] text-[#8C4A2F]">Como funciona</p>
          <h2 className="font-display mt-3 text-3xl font-medium tracking-tight text-[#241C16] md:text-4xl">
            Quatro passos, do registo ao acompanhamento
          </h2>

          <ol className="mt-14 divide-y divide-[#8C4A2F]/15">
            {STEPS.map((step, i) => (
              <li key={step.title} className="flex gap-6 py-6 first:pt-0 last:pb-0">
                <span className="font-plex text-lg font-medium text-[#8C4A2F]/45">{String(i + 1).padStart(2, '0')}</span>
                <div>
                  <p className="font-display text-lg font-medium text-[#241C16]">{step.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-[#5C5346]">{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Sobre Nós */}
      <section id="sobre" className="bg-[#16211E] py-24 text-[#F4EDE3]">
        <div className="mx-auto grid max-w-5xl gap-14 px-4 md:grid-cols-[1.2fr_1fr]">
          <div>
            <p className="font-plex text-xs font-medium uppercase tracking-[0.3em] text-[#E3A857]">Sobre nós</p>
            <h2 className="font-display mt-3 text-3xl font-medium tracking-tight">
              Agência Funerária Espírito Santo
            </h2>
            <p className="mt-5 leading-relaxed text-[#CFC3B2]">
              Somos uma agência funerária sediada na Matola, a prestar serviços de assistência e intermediação de
              benefícios a famílias em todo o território moçambicano. Da comunicação do óbito à realização da
              cerimónia, tratamos de cada detalhe para que a família possa concentrar-se no que importa.
            </p>
          </div>

          <div className="md:border-l md:border-[#E3A857]/15 md:pl-10">
            <p className="font-display text-lg font-medium">Sempre por perto, quando é preciso</p>
            <p className="mt-4 text-sm leading-relaxed text-[#CFC3B2]">
              Acompanhamos cada família de perto, do primeiro contacto ao último cortejo.
            </p>
            <Link
              to="/adesao"
              className="mt-8 inline-flex items-center gap-1.5 text-sm font-medium text-[#E3A857] hover:text-[#EDBB77]"
            >
              Aderir ao seguro <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
