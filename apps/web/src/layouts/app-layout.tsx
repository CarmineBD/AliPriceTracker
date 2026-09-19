import type { PropsWithChildren } from 'react';
import { Link } from 'react-router-dom';

const navigationLinkClass =
  'rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground';

export function AppLayout({ children }: PropsWithChildren) {
  return (
    <>
      <header className="border-b bg-background">
        <nav className="mx-auto flex max-w-7xl items-center gap-2 px-6 py-3" aria-label="Principal">
          <span className="mr-3 text-lg font-semibold">AliTracker</span>
          <Link to="/" className={navigationLinkClass}>
            Productos
          </Link>
          <Link to="/stores" className={navigationLinkClass}>
            Tiendas
          </Link>
          <Link to="/events" className={navigationLinkClass}>
            Eventos y cupones
          </Link>
          <Link to="/opportunities" className={navigationLinkClass}>
            Oportunidades
          </Link>
          <Link to="/publication-product-changes" className={navigationLinkClass}>
            Últimos cambios
          </Link>
          <Link to="/aliexpress" className={navigationLinkClass}>
            Buscar en AliExpress
          </Link>
        </nav>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-12">{children}</main>
    </>
  );
}
