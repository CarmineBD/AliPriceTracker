import { createBrowserRouter } from 'react-router-dom';

import { ProductsPage } from '@/pages/products-page';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <ProductsPage />,
  },
]);
