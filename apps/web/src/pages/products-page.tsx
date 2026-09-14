import { useState } from 'react';

import type { Product } from '@alitracker/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';

import {
  createProduct,
  deleteProduct,
  getProducts,
  updateProduct,
  uploadProductImage,
} from '@/api/products.api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DeleteProductDialog } from '@/features/products/delete-product-dialog';
import {
  ProductFormDialog,
  type ProductFormSubmission,
} from '@/features/products/product-form-dialog';
import { ProductsTable } from '@/features/products/products-table';
import { AppLayout } from '@/layouts/app-layout';

const productsQueryKey = ['products'] as const;

export function ProductsPage() {
  const queryClient = useQueryClient();
  const [formProduct, setFormProduct] = useState<Product | null | undefined>(undefined);
  const [productToDelete, setProductToDelete] = useState<Product>();
  const productsQuery = useQuery({ queryKey: productsQueryKey, queryFn: getProducts });

  const refreshProducts = async () => {
    await queryClient.invalidateQueries({ queryKey: productsQueryKey });
  };

  const saveMutation = useMutation({
    mutationFn: async ({ input, imageFile }: ProductFormSubmission) => {
      const product = formProduct
        ? await updateProduct(formProduct.id, input)
        : await createProduct(input);

      if (imageFile) {
        return uploadProductImage(product.id, imageFile);
      }

      return product;
    },
    onSuccess: async () => {
      setFormProduct(undefined);
      await refreshProducts();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteProduct,
    onSuccess: async () => {
      setProductToDelete(undefined);
      await refreshProducts();
    },
  });

  const isFormOpen = formProduct !== undefined;
  const formError = saveMutation.isError
    ? 'No se pudo guardar el producto. Inténtalo de nuevo.'
    : undefined;
  const deleteError = deleteMutation.isError
    ? 'No se pudo eliminar el producto. Inténtalo de nuevo.'
    : undefined;

  return (
    <AppLayout>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">Productos</h1>
          <p className="mt-2 text-slate-600">Gestiona los productos base de AliTracker.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Listado de productos</CardTitle>
        </CardHeader>
        <CardContent>
          {productsQuery.isPending && <p role="status">Cargando productos…</p>}
          {productsQuery.isError && (
            <p className="text-destructive" role="alert">
              No se pudieron cargar los productos. Comprueba que la API y la base de datos estén
              disponibles.
            </p>
          )}
          {productsQuery.isSuccess && (
            <ProductsTable
              products={productsQuery.data}
              onEdit={(product) => {
                saveMutation.reset();
                setFormProduct(product);
              }}
              onDelete={(product) => {
                deleteMutation.reset();
                setProductToDelete(product);
              }}
            />
          )}
        </CardContent>
      </Card>

      <div className="mt-4 flex justify-end">
        <Button
          onClick={() => {
            saveMutation.reset();
            setFormProduct(null);
          }}
        >
          <Plus />
          Agregar nuevo producto
        </Button>
      </div>

      <ProductFormDialog
        open={isFormOpen}
        product={formProduct ?? undefined}
        isSaving={saveMutation.isPending}
        error={formError}
        onOpenChange={(open) => {
          if (!open && !saveMutation.isPending) {
            setFormProduct(undefined);
          }
        }}
        onSubmit={(input) => saveMutation.mutate(input)}
      />
      <DeleteProductDialog
        product={productToDelete}
        isDeleting={deleteMutation.isPending}
        error={deleteError}
        onOpenChange={(open) => {
          if (!open && !deleteMutation.isPending) {
            setProductToDelete(undefined);
          }
        }}
        onConfirm={() => {
          if (productToDelete) {
            deleteMutation.mutate(productToDelete.id);
          }
        }}
      />
    </AppLayout>
  );
}
