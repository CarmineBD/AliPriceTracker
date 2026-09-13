import type { PropsWithChildren } from 'react';

export function AppLayout({ children }: PropsWithChildren) {
  return <main className="mx-auto max-w-3xl px-6 py-12">{children}</main>;
}
