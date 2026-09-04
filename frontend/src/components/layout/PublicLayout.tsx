import { Link, Outlet } from 'react-router-dom';
import { HeartHandshake, MapPin } from 'lucide-react';
import { CapulanaFrieze } from '@/components/ui/DecorativeArt';

export function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-[#EDE3D6]">
      <header className="sticky top-0 z-40 border-b border-[#3A2E22]/40 bg-[#16211E]/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-[#E3A857]/30 bg-[#1D2B27] text-[#E3A857]">
              <HeartHandshake className="h-4 w-4" />
            </div>
            <div className="leading-tight">
              <p className="font-display text-[15px] font-medium tracking-tight text-[#F4EDE3]">Espírito Santo</p>
              <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-[#E3A857]/80">Agência Funerária</p>
            </div>
          </Link>
          <nav className="hidden items-center gap-8 text-sm font-medium text-[#CFC3B2] md:flex">
            <a href="/#sobre" className="transition hover:text-[#F4EDE3]">
              Sobre Nós
            </a>
            <a href="/#caminho" className="transition hover:text-[#F4EDE3]">
              Como Funciona
            </a>
            <a href="/#contacto" className="transition hover:text-[#F4EDE3]">
              Contacto
            </a>
          </nav>
          <div className="flex items-center gap-1">
            <Link to="/login" className="rounded-full px-4 py-2 text-sm font-medium text-[#CFC3B2] hover:bg-white/5">
              Entrar
            </Link>
            <Link
              to="/adesao"
              className="rounded-full bg-[#E3A857] px-5 py-2 text-sm font-medium text-[#1B140D] transition hover:bg-[#EDBB77]"
            >
              Aderir Agora
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer id="contacto" className="border-t border-[#3A2E22]/50 bg-[#16211E] text-[#CFC3B2]">
        <div className="text-[#E3A857]/50">
          <CapulanaFrieze className="mx-auto h-4 w-full max-w-6xl" opacity={0.55} />
        </div>
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 md:grid-cols-3">
          <div>
            <p className="font-display text-lg font-medium tracking-tight text-[#F4EDE3]">
              Agência Funerária Espírito Santo
            </p>
            <p className="mt-3 text-sm leading-relaxed text-[#A99C89]">
              Assessoria e prestação de serviços funerários com dignidade, respeito e profissionalismo em todo o
              território moçambicano.
            </p>
            <Link
              to="/comunicar-obito"
              className="mt-5 inline-block text-sm font-medium text-[#E3A857] underline decoration-[#E3A857]/30 underline-offset-4 transition hover:text-[#EDBB77]"
            >
              Precisa de comunicar um falecimento? Aceda aqui.
            </Link>
          </div>
          <div className="text-sm">
            <p className="font-plex text-xs font-medium uppercase tracking-[0.2em] text-[#8FA396]">Contactos</p>
            <p className="mt-3 flex items-center gap-2 text-[#CFC3B2]">
              <MapPin className="h-4 w-4 text-[#8FA396]" /> Bairro Matola A, Av. Da Namaacha, Km 11, Matola
            </p>
            <p className="mt-2 font-plex text-[#8FA396]">NUIT: 401463860</p>
          </div>
          <div className="text-sm">
            <p className="font-plex text-xs font-medium uppercase tracking-[0.2em] text-[#8FA396]">Planos</p>
            <p className="mt-3 text-[#A99C89]">Premium · Lite · Lite Plus · Gold · Gold Plus</p>
          </div>
        </div>
        <div className="border-t border-white/5 py-5 text-center font-plex text-xs text-[#6B6153]">
          © {new Date().getFullYear()} Agência Funerária Espírito Santo. Todos os direitos reservados.
        </div>
      </footer>
    </div>
  );
}
