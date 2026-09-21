import { createBrowserRouter } from 'react-router-dom';

import { AliExpressProductSearchPage } from '@/pages/aliexpress-product-search-page';
import { EventsPage } from '@/pages/events-page';
import { OpportunitiesPage } from '@/pages/opportunities-page';
import { ProductDetailPage } from '@/pages/product-detail-page';
import { PublicationProductChangesPage } from '@/pages/publication-product-changes-page';
import { ProductsPage } from '@/pages/products-page';
import { PurchasesPage } from '@/pages/purchases-page';
import { SalesPage } from '@/pages/sales-page';
import { StoresPage } from '@/pages/stores-page';
import { StoreDetailPage } from '@/pages/store-detail-page';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <ProductsPage />,
  },
  {
    path: '/products/:id',
    element: <ProductDetailPage />,
  },
  {
    path: '/aliexpress',
    element: <AliExpressProductSearchPage />,
  },
  {
    path: '/events',
    element: <EventsPage />,
  },
  {
    path: '/purchases',
    element: <PurchasesPage />,
  },
  {
    path: '/sales',
    element: <SalesPage />,
  },
  {
    path: '/opportunities',
    element: <OpportunitiesPage />,
  },
  {
    path: '/publication-product-changes',
    element: <PublicationProductChangesPage />,
  },
  {
    path: '/stores',
    element: <StoresPage />,
  },
  {
    path: '/stores/:id',
    element: <StoreDetailPage />,
  },
]);
