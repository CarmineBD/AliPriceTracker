import { createBrowserRouter } from 'react-router-dom';

import { ProductDetailPage } from '@/pages/product-detail-page';
import { ProductsPage } from '@/pages/products-page';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <ProductsPage />,
  },
  {
    path: '/products/:id',
    element: <ProductDetailPage />,
  },
]);
