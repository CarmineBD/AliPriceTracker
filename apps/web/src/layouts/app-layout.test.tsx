import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { AppLayout } from './app-layout';

describe('AppLayout', () => {
  it('renders the requested navigation groups and AliExpress action', () => {
    render(
      <MemoryRouter>
        <AppLayout>Contenido</AppLayout>
      </MemoryRouter>,
    );

    expect(screen.getByRole('button', { name: 'Gestión' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Registros' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Eventos y cupones' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Oportunidades' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '+ Añadir de AliExpress' })).toHaveAttribute(
      'href',
      '/aliexpress',
    );
  });
});
