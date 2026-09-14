import type {
  SellerCreateInput,
  SellerProductCreateInput,
  SellerProductUpdateInput,
  SellerProductsListQuery,
  SellerUpdateInput,
  SellersListQuery,
} from '@alitracker/shared';

import { HttpError } from '../../utils/http-error';
import { ProductsRepository } from '../products/products.repository';
import { SellerProductsRepository, SellersRepository } from './sellers.repository';

const sellersRepository = new SellersRepository();
const sellerProductsRepository = new SellerProductsRepository();
const productsRepository = new ProductsRepository();

type StoredSeller = NonNullable<Awaited<ReturnType<SellersRepository['findById']>>>;
type StoredSellerProduct = NonNullable<Awaited<ReturnType<SellerProductsRepository['findById']>>>;

function toSellerResponse(seller: StoredSeller) {
  return {
    id: seller.id,
    name: seller.name,
    location: seller.location,
    reviewScore: seller.reviewScore,
    salesCount: seller.salesCount,
    createdAt: seller.createdAt,
    updatedAt: seller.updatedAt,
  };
}

function toSellerProductResponse(sellerProduct: StoredSellerProduct) {
  return {
    id: sellerProduct.id,
    sellerId: sellerProduct.sellerId,
    productId: sellerProduct.productId,
    quantityAvailable: sellerProduct.quantityAvailable,
    maxPurchase: sellerProduct.maxPurchase,
    url: sellerProduct.url,
    aliexpressItemId: sellerProduct.aliexpressItemId,
    createdAt: sellerProduct.createdAt,
    updatedAt: sellerProduct.updatedAt,
  };
}

async function ensureSellerExists(id: string) {
  if (!(await sellersRepository.findById(id))) {
    throw new HttpError('Seller not found.', 404);
  }
}

async function ensureProductExists(id: string) {
  if (!(await productsRepository.findById(id))) {
    throw new HttpError('Product not found.', 404);
  }
}

async function ensureAliExpressItemIdAvailable(aliexpressItemId: string, sellerProductId?: string) {
  const existing = await sellerProductsRepository.findByAliExpressItemId(aliexpressItemId);

  if (existing && existing.id !== sellerProductId) {
    throw new HttpError('An offer with this AliExpress item ID already exists.', 409);
  }
}

export async function listSellers(query: SellersListQuery) {
  const { items, total } = await sellersRepository.findPage(query);
  return {
    sellers: items.map(toSellerResponse),
    pagination: {
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.ceil(total / query.pageSize),
    },
  };
}

export async function getSeller(id: string) {
  const seller = await sellersRepository.findById(id);
  if (!seller) throw new HttpError('Seller not found.', 404);
  return toSellerResponse(seller);
}

export async function createSeller(input: SellerCreateInput) {
  const seller = await sellersRepository.create(input);
  if (!seller) throw new Error('Seller creation did not return a seller.');
  return toSellerResponse(seller);
}

export async function updateSeller(id: string, input: SellerUpdateInput) {
  const seller = await sellersRepository.update(id, input);
  if (!seller) throw new HttpError('Seller not found.', 404);
  return toSellerResponse(seller);
}

export async function deleteSeller(id: string) {
  await getSeller(id);
  if ((await sellerProductsRepository.countBySellerId(id)) > 0) {
    throw new HttpError('Cannot delete a seller with existing offers.', 409);
  }
  await sellersRepository.delete(id);
}

export async function listSellerProducts(query: SellerProductsListQuery) {
  const { items, total } = await sellerProductsRepository.findPage(query);
  return {
    sellerProducts: items.map(toSellerProductResponse),
    pagination: {
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.ceil(total / query.pageSize),
    },
  };
}

export async function getSellerProduct(id: string) {
  const sellerProduct = await sellerProductsRepository.findById(id);
  if (!sellerProduct) throw new HttpError('Seller product not found.', 404);
  return toSellerProductResponse(sellerProduct);
}

export async function createSellerProduct(input: SellerProductCreateInput) {
  await Promise.all([ensureSellerExists(input.sellerId), ensureProductExists(input.productId)]);
  await ensureAliExpressItemIdAvailable(input.aliexpressItemId);
  const sellerProduct = await sellerProductsRepository.create(input);
  if (!sellerProduct) throw new Error('Seller product creation did not return an offer.');
  return toSellerProductResponse(sellerProduct);
}

export async function updateSellerProduct(id: string, input: SellerProductUpdateInput) {
  const current = await sellerProductsRepository.findById(id);
  if (!current) throw new HttpError('Seller product not found.', 404);

  await Promise.all([
    input.sellerId ? ensureSellerExists(input.sellerId) : undefined,
    input.productId ? ensureProductExists(input.productId) : undefined,
    input.aliexpressItemId
      ? ensureAliExpressItemIdAvailable(input.aliexpressItemId, id)
      : undefined,
  ]);

  const sellerProduct = await sellerProductsRepository.update(id, input);
  if (!sellerProduct) throw new Error('Seller product update did not return an offer.');
  return toSellerProductResponse(sellerProduct);
}

export async function deleteSellerProduct(id: string) {
  const sellerProduct = await sellerProductsRepository.delete(id);
  if (!sellerProduct) throw new HttpError('Seller product not found.', 404);
}
