import { Toast } from '@base-ui/react/toast';
import { X } from 'lucide-react';

import { cn } from '@/lib/utils';

type ToastOptions = {
  title: string;
  description?: string;
  type?: 'success' | 'error';
};

const toastManager = Toast.createToastManager();

export function toast({ title, description, type = 'success' }: ToastOptions) {
  return toastManager.add({ title, description, type });
}

function ToastList() {
  const { toasts } = Toast.useToastManager();

  return toasts.map((item) => (
    <Toast.Root
      key={item.id}
      toast={item}
      className="w-full rounded-lg border bg-background shadow-lg transition-all data-starting-style:translate-y-2 data-starting-style:opacity-0 data-ending-style:translate-y-2 data-ending-style:opacity-0 data-[type=error]:border-destructive"
    >
      <Toast.Content className="flex items-start gap-3 p-4">
        <div className="min-w-0 flex-1">
          <Toast.Title className="text-sm font-medium" />
          <Toast.Description className="mt-1 text-sm text-muted-foreground" />
        </div>
        <Toast.Close
          className="rounded-sm p-1 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Cerrar notificación"
        >
          <X className="size-4" />
        </Toast.Close>
      </Toast.Content>
    </Toast.Root>
  ));
}

export function Toaster() {
  return (
    <Toast.Provider toastManager={toastManager} timeout={3000} limit={3}>
      <Toast.Portal>
        <Toast.Viewport
          className={cn(
            'fixed bottom-4 right-4 z-50 flex w-[calc(100vw-2rem)] flex-col gap-2 sm:w-96',
          )}
        >
          <ToastList />
        </Toast.Viewport>
      </Toast.Portal>
    </Toast.Provider>
  );
}
