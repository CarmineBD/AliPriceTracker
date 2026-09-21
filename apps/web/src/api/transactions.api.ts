import {
  purchaseCreateSchema,
  purchasesListResponseSchema,
  purchaseUpdateSchema,
  saleCreateSchema,
  salesListResponseSchema,
  saleUpdateSchema,
  transactionsListQuerySchema,
  type PurchaseCreateInput,
  type PurchasesList,
  type PurchaseUpdateInput,
  type SaleCreateInput,
  type SalesList,
  type SaleUpdateInput,
  type TransactionsListQuery,
} from '@alitracker/shared';

import { request } from './client';

function jsonRequest(method: 'POST' | 'PATCH', body: unknown): RequestInit {
  return {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}

function paginationSearch(query: TransactionsListQuery): string {
  const parsed = transactionsListQuerySchema.parse(query);
  return new URLSearchParams({
    page: String(parsed.page),
    pageSize: String(parsed.pageSize),
  }).toString();
}

export async function getPurchases(query: TransactionsListQuery): Promise<PurchasesList> {
  return purchasesListResponseSchema.parse(
    await request<unknown>(`/api/purchases?${paginationSearch(query)}`),
  );
}

export async function createPurchase(input: PurchaseCreateInput): Promise<void> {
  await request<unknown>('/api/purchases', jsonRequest('POST', purchaseCreateSchema.parse(input)));
}

export async function updatePurchase(id: string, input: PurchaseUpdateInput): Promise<void> {
  await request<unknown>(
    `/api/purchases/${id}`,
    jsonRequest('PATCH', purchaseUpdateSchema.parse(input)),
  );
}

export async function deletePurchase(id: string): Promise<void> {
  await request<void>(`/api/purchases/${id}`, { method: 'DELETE' });
}

export async function getSales(query: TransactionsListQuery): Promise<SalesList> {
  return salesListResponseSchema.parse(
    await request<unknown>(`/api/sales?${paginationSearch(query)}`),
  );
}

export async function createSale(input: SaleCreateInput): Promise<void> {
  await request<unknown>('/api/sales', jsonRequest('POST', saleCreateSchema.parse(input)));
}

export async function updateSale(id: string, input: SaleUpdateInput): Promise<void> {
  await request<unknown>(`/api/sales/${id}`, jsonRequest('PATCH', saleUpdateSchema.parse(input)));
}

export async function deleteSale(id: string): Promise<void> {
  await request<void>(`/api/sales/${id}`, { method: 'DELETE' });
}
