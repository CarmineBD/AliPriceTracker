import { createBrowserRouter } from 'react-router-dom';

import { AliExpressProductSearchPage } from '@/pages/aliexpress-product-search-page';
import { ProductDetailPage } from '@/pages/product-detail-page';
import { ProductsPage } from '@/pages/products-page';
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
    path: '/stores',
    element: <StoresPage />,
  },
  {
    path: '/stores/:id',
    element: <StoreDetailPage />,
  },
]);
