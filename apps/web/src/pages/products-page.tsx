import { useState } from 'react';

import type { Product } from '@alitracker/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';

import {
  createProduct,
  deleteProduct,
  getProductComponents,
  getProductOptions,
  getProducts,
  replaceProductComponents,
  updateProduct,
  uploadProductImage,
} from '@/api/products.api';
import { Button } from '@/components/ui/button';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { DeleteProductDialog } from '@/features/products/delete-product-dialog';
import {
  ProductFormDialog,
  type ProductFormSubmission,
} from '@/features/products/product-form-dialog';
import { ProductsTable } from '@/features/products/products-table';
import { AppLayout } from '@/layouts/app-layout';

const pageSize = 20;

function getPageItems(currentPage: number, totalPages: number): Array<number | 'ellipsis'> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, 'ellipsis', totalPages];
  }

  if (currentPage >= totalPages - 3) {
    return [
      1,
      'ellipsis',
      totalPages - 4,
      totalPages - 3,
      totalPages - 2,
      totalPages - 1,
      totalPages,
    ];
  }

  return [1, 'ellipsis', currentPage - 1, currentPage, currentPage + 1, 'ellipsis', totalPages];
}

export function ProductsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [formProduct, setFormProduct] = useState<Product | null | undefined>(undefined);
  const [productToDelete, setProductToDelete] = useState<Product>();
  const productsQuery = useQuery({
    queryKey: ['products', { page, pageSize }],
    queryFn: () => getProducts({ page, pageSize }),
  });
  const productOptionsQuery = useQuery({
    queryKey: ['product-options'],
    queryFn: getProductOptions,
    enabled: formProduct !== undefined,
  });
  const productComponentsQuery = useQuery({
    queryKey: ['product-components', formProduct?.id],
    queryFn: () => getProductComponents(formProduct?.id ?? ''),
    enabled: Boolean(formProduct),
  });

  const refreshProducts = async () => {
    await queryClient.invalidateQueries({ queryKey: ['products'] });
  };

  const saveMutation = useMutation({
    mutationFn: async ({ input, imageFile, components }: ProductFormSubmission) => {
      const product = formProduct ?? (await createProduct(input));

      await replaceProductComponents(product.id, components);

      const savedProduct = formProduct ? await updateProduct(product.id, input) : product;

      if (imageFile) {
        await uploadProductImage(savedProduct.id, imageFile);
      }

      return savedProduct;
    },
    onSuccess: async () => {
      setFormProduct(undefined);
      await Promise.all([
        refreshProducts(),
        queryClient.invalidateQueries({ queryKey: ['product-components'] }),
      ]);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteProduct,
    onSuccess: async () => {
      setProductToDelete(undefined);

      if (productsQuery.data?.products.length === 1 && page > 1) {
        setPage((currentPage) => currentPage - 1);
        return;
      }

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
  const pagination = productsQuery.data?.pagination;

  return (
    <AppLayout>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">Productos</h1>
          <p className="mt-2 text-slate-600">Gestiona los productos base de AliTracker.</p>
        </div>
      </div>

      <section aria-labelledby="products-list-title">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
          <h2 id="products-list-title" className="text-xl font-medium">
            Listado de productos
          </h2>
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
        <div className="flex flex-col gap-3">
          {productsQuery.isPending && <p role="status">Cargando productos…</p>}
          {productsQuery.isError && (
            <p className="text-destructive" role="alert">
              No se pudieron cargar los productos. Comprueba que la API y la base de datos estén
              disponibles.
            </p>
          )}
          {productsQuery.isSuccess && (
            <>
              <ProductsTable
                products={productsQuery.data.products}
                onEdit={(product) => {
                  saveMutation.reset();
                  setFormProduct(product);
                }}
                onDelete={(product) => {
                  deleteMutation.reset();
                  setProductToDelete(product);
                }}
              />

              {pagination && pagination.totalPages > 1 && (
                <div className="mt-6 space-y-3">
                  <p className="text-center text-sm text-muted-foreground">
                    Mostrando {(pagination.page - 1) * pagination.pageSize + 1}–
                    {Math.min(pagination.page * pagination.pageSize, pagination.total)} de{' '}
                    {pagination.total} productos
                  </p>
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          href={pagination.page > 1 ? '#' : undefined}
                          className={
                            pagination.page === 1 ? 'pointer-events-none opacity-50' : undefined
                          }
                          onClick={(event) => {
                            event.preventDefault();
                            if (pagination.page > 1) setPage(pagination.page - 1);
                          }}
                        />
                      </PaginationItem>
                      {getPageItems(pagination.page, pagination.totalPages).map((item, index) =>
                        item === 'ellipsis' ? (
                          <PaginationItem key={`ellipsis-${index}`}>
                            <PaginationEllipsis />
                          </PaginationItem>
                        ) : (
                          <PaginationItem key={item}>
                            <PaginationLink
                              href="#"
                              isActive={item === pagination.page}
                              onClick={(event) => {
                                event.preventDefault();
                                setPage(item);
                              }}
                            >
                              {item}
                            </PaginationLink>
                          </PaginationItem>
                        ),
                      )}
                      <PaginationItem>
                        <PaginationNext
                          href={pagination.page < pagination.totalPages ? '#' : undefined}
                          className={
                            pagination.page === pagination.totalPages
                              ? 'pointer-events-none opacity-50'
                              : undefined
                          }
                          onClick={(event) => {
                            event.preventDefault();
                            if (pagination.page < pagination.totalPages)
                              setPage(pagination.page + 1);
                          }}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      <ProductFormDialog
        open={isFormOpen}
        product={formProduct ?? undefined}
        isSaving={saveMutation.isPending}
        components={productComponentsQuery.data}
        componentsLoading={Boolean(formProduct) && productComponentsQuery.isPending}
        productOptions={productOptionsQuery.data}
        productOptionsLoading={productOptionsQuery.isPending}
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
