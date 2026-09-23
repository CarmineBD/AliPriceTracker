import type { PropsWithChildren } from 'react';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from '@/components/ui/navigation-menu';

function MenuLink({ to, children }: PropsWithChildren<{ to: string }>) {
  return (
    <NavigationMenuLink render={<Link to={to} />} closeOnClick>
      {children}
    </NavigationMenuLink>
  );
}

export function AppLayout({ children }: PropsWithChildren) {
  return (
    <>
      <header className="border-b bg-background">
        <nav className="mx-auto flex max-w-7xl items-center gap-2 px-6 py-3" aria-label="Principal">
          <span className="mr-3 text-lg font-semibold">AliTracker</span>
          <NavigationMenu>
            <NavigationMenuList>
              <NavigationMenuItem>
                <NavigationMenuTrigger>Gestión</NavigationMenuTrigger>
                <NavigationMenuContent className="grid w-44 gap-1">
                  <MenuLink to="/purchases">Compras</MenuLink>
                  <MenuLink to="/sales">Ventas</MenuLink>
                  <MenuLink to="/stock">Stock</MenuLink>
                  <MenuLink to="/metrics">Métricas</MenuLink>
                  <MenuLink to="/average-prices">Precios medios</MenuLink>
                </NavigationMenuContent>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <NavigationMenuTrigger>Registros</NavigationMenuTrigger>
                <NavigationMenuContent className="grid w-44 gap-1">
                  <MenuLink to="/">Productos</MenuLink>
                  <MenuLink to="/stores">Tiendas</MenuLink>
                </NavigationMenuContent>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <NavigationMenuTrigger>Eventos y cupones</NavigationMenuTrigger>
                <NavigationMenuContent className="grid w-44 gap-1">
                  <MenuLink to="/events">Eventos</MenuLink>
                  <MenuLink to="/events">Cupones</MenuLink>
                </NavigationMenuContent>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <NavigationMenuTrigger>Oportunidades</NavigationMenuTrigger>
                <NavigationMenuContent className="grid w-52 gap-1">
                  <MenuLink to="/opportunities">Mejores oportunidades</MenuLink>
                  <MenuLink to="/publication-product-changes">Últimos cambios</MenuLink>
                </NavigationMenuContent>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>
          <div className="ml-auto">
            <Button nativeButton={false} render={<Link to="/aliexpress" />}>
              + Añadir de AliExpress
            </Button>
          </div>
        </nav>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-12">{children}</main>
    </>
  );
}
