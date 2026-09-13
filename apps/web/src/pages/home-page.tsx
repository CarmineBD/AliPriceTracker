import { useQuery } from '@tanstack/react-query';

import { getHealth } from '@/api/health.api';
import { AppLayout } from '@/layouts/app-layout';

export function HomePage() {
  const healthQuery = useQuery({
    queryKey: ['health'],
    queryFn: getHealth,
  });

  const connectionMessage = healthQuery.isPending
    ? 'Checking API…'
    : healthQuery.isSuccess
      ? 'API connected'
      : 'API unavailable';

  return (
    <AppLayout>
      <h1 className="text-3xl font-semibold text-slate-900">AliTracker</h1>
      <p className="mt-3 text-slate-600" role="status">
        {connectionMessage}
      </p>
    </AppLayout>
  );
}
