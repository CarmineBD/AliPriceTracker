import type { ProductCreateInput, ProductUpdateInput } from '@alitracker/shared';

import { HttpError } from '../../utils/http-error';
import { ProductsRepository } from './products.repository';

const productsRepository = new ProductsRepository();

export async function listProducts() {
  return productsRepository.findAll();
}

export async function getProduct(id: string) {
  const product = await productsRepository.findById(id);

  if (!product) {
    throw new HttpError('Product not found.', 404);
  }

  return product;
}

export async function createProduct(input: ProductCreateInput) {
  return productsRepository.create(input);
}

export async function updateProduct(id: string, input: ProductUpdateInput) {
  const product = await productsRepository.update(id, input);

  if (!product) {
    throw new HttpError('Product not found.', 404);
  }

  return product;
}

export async function deleteProduct(id: string) {
  const product = await productsRepository.delete(id);

  if (!product) {
    throw new HttpError('Product not found.', 404);
  }
}
