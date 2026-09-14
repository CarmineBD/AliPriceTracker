import type {
  ProductCreateInput,
  ProductImageContentType,
  ProductsListQuery,
  ProductUpdateInput,
} from '@alitracker/shared';

import { deleteFile, getPublicUrl, uploadFile } from '../../services/storage.service';
import { HttpError } from '../../utils/http-error';
import { ProductsRepository } from './products.repository';

const productsRepository = new ProductsRepository();

const imageExtensions: Record<ProductImageContentType, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

type StoredProduct = NonNullable<Awaited<ReturnType<ProductsRepository['findById']>>>;

function toProductResponse(product: StoredProduct) {
  return {
    id: product.id,
    name: product.name,
    shortName: product.shortName,
    imageKey: product.imageKey,
    imageUrl: product.imageKey ? getPublicUrl(product.imageKey) : null,
    description: product.description,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };
}

export async function listProducts(query: ProductsListQuery) {
  const { items, total } = await productsRepository.findPage(query);

  return {
    products: items.map(toProductResponse),
    pagination: {
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.ceil(total / query.pageSize),
    },
  };
}

export async function getProduct(id: string) {
  const product = await productsRepository.findById(id);

  if (!product) {
    throw new HttpError('Product not found.', 404);
  }

  return toProductResponse(product);
}

export async function createProduct(input: ProductCreateInput) {
  const product = await productsRepository.create(input);

  if (!product) {
    throw new Error('Product creation did not return a product.');
  }

  return toProductResponse(product);
}

export async function updateProduct(id: string, input: ProductUpdateInput) {
  const product = await productsRepository.update(id, input);

  if (!product) {
    throw new HttpError('Product not found.', 404);
  }

  return toProductResponse(product);
}

export async function uploadProductImage(
  id: string,
  file: { buffer: Buffer; contentType: ProductImageContentType },
) {
  const product = await productsRepository.findById(id);

  if (!product) {
    throw new HttpError('Product not found.', 404);
  }

  const key = `products/${id}/${crypto.randomUUID()}.${imageExtensions[file.contentType]}`;

  await uploadFile({
    key,
    buffer: file.buffer,
    contentType: file.contentType,
  });

  try {
    const updatedProduct = await productsRepository.updateImageKey(id, key);

    if (!updatedProduct) {
      throw new Error('Product image update did not return a product.');
    }

    if (product.imageKey) {
      try {
        await deleteFile(product.imageKey);
      } catch (error) {
        console.error(`Failed to delete previous product image: ${product.imageKey}`, error);
      }
    }

    return toProductResponse(updatedProduct);
  } catch (error) {
    await deleteFile(key).catch((cleanupError: unknown) => {
      console.error(`Failed to clean up product image: ${key}`, cleanupError);
    });
    throw error;
  }
}

export async function deleteProduct(id: string) {
  const product = await productsRepository.delete(id);

  if (!product) {
    throw new HttpError('Product not found.', 404);
  }

  if (product.imageKey) {
    try {
      await deleteFile(product.imageKey);
    } catch (error) {
      console.error(`Failed to delete product image: ${product.imageKey}`, error);
    }
  }
}
