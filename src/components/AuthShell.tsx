import type { ReactNode } from 'react';

interface AuthShellProps {
  heroTitle: string;
  heroSubtitle: string;
  heroDescription?: string;
  heroIcon: string;
  heroExtra?: ReactNode;
  children: ReactNode;
}

export default function AuthShell({
  heroTitle,
  heroSubtitle,
  heroDescription,
  heroIcon,
  heroExtra,
  children
}: AuthShellProps) {
  return (
    <main className="flex min-h-screen bg-slate-100">
      <div className="flex min-h-screen flex-1 overflow-hidden border border-slate-100 bg-white shadow-[0_30px_80px_rgba(15,23,42,0.12)]">
        <div className="grid min-h-screen w-full lg:grid-cols-2">
          <section
            className="relative overflow-hidden bg-brand-50 bg-cover bg-center text-white"
            style={{ backgroundImage: "url('/images/auth-bg.webp')" }}
          >
            <div className="absolute inset-0 bg-gradient-to-b from-brand-700 via-brand-500 to-brand-700 opacity-55" />

            <div className="relative flex flex-col gap-6 p-10 lg:p-12">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/15 backdrop-blur">
                <i className={`${heroIcon} text-xl`} />
              </div>
              <div className="space-y-1">
                <p className="text-sm text-white/80">{heroTitle}</p>
                <h1 className="text-3xl font-semibold">{heroSubtitle}</h1>
              </div>
              {heroDescription ? (
                <p className="max-w-md text-sm leading-relaxed text-white/85">{heroDescription}</p>
              ) : null}
              {heroExtra}
            </div>
          </section>

          <section className="flex items-center justify-center bg-brand-50 p-8 lg:p-10">
            <div className="w-full max-w-md">{children}</div>
          </section>
        </div>
      </div>
    </main>
  );
}
