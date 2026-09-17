import type { ProductComboCreateInput, ProductComboUpdateInput } from '@alitracker/shared';

import { getPublicUrl } from '../../services/storage.service';
import { HttpError } from '../../utils/http-error';
import { ProductsRepository } from './products.repository';
import { ProductCombosRepository } from './product-combos.repository';

const productsRepository = new ProductsRepository();
const productCombosRepository = new ProductCombosRepository();

export type ProductComboServiceRepositories = {
  products: Pick<ProductsRepository, 'findById'>;
  combos: Pick<
    ProductCombosRepository,
    | 'create'
    | 'delete'
    | 'findComponent'
    | 'findComponents'
    | 'hasComponents'
    | 'isContainedByAnotherProduct'
    | 'update'
  >;
};

const defaultRepositories: ProductComboServiceRepositories = {
  products: productsRepository,
  combos: productCombosRepository,
};

function toProductComboResponse(component: Awaited<ReturnType<ProductCombosRepository['findComponent']>>) {
  if (!component) return undefined;

  const averageSellingPrice =
    component.averageSellingPrice === null ? null : Number(component.averageSellingPrice);

  return {
    productId: component.productId,
    containsProductId: component.containsProductId,
    quantity: component.quantity,
    product: {
      id: component.containsProductId,
      name: component.name,
      shortName: component.shortName,
      imageKey: component.imageKey,
      imageUrl: component.imageKey ? getPublicUrl(component.imageKey) : null,
      averageSellingPrice,
      // Backend validation ensures a component is always a non-combo product.
      effectiveSellingPrice: averageSellingPrice,
    },
  };
}

async function ensureProductExists(
  productId: string,
  repositories: ProductComboServiceRepositories,
) {
  const product = await repositories.products.findById(productId);
  if (!product) throw new HttpError('Product not found.', 404);
  return product;
}

export async function listProductComponents(
  productId: string,
  repositories: ProductComboServiceRepositories = defaultRepositories,
) {
  await ensureProductExists(productId, repositories);
  const components = await repositories.combos.findComponents(productId);
  return components.map((component) => toProductComboResponse(component)!);
}

export async function addProductComponent(
  productId: string,
  input: ProductComboCreateInput,
  repositories: ProductComboServiceRepositories = defaultRepositories,
) {
  const [, , componentIsCombo, productIsAlreadyAComponent, existing] = await Promise.all([
    ensureProductExists(productId, repositories),
    ensureProductExists(input.containsProductId, repositories),
    repositories.combos.hasComponents(input.containsProductId),
    repositories.combos.isContainedByAnotherProduct(productId),
    repositories.combos.findComponent(productId, input.containsProductId),
  ]);

  if (productId === input.containsProductId) {
    throw new HttpError('A product cannot contain itself.', 400);
  }
  if (componentIsCombo) {
    throw new HttpError('A combo cannot be added as a component.', 409);
  }
  if (productIsAlreadyAComponent) {
    throw new HttpError('A product that is already a component cannot become a combo.', 409);
  }
  if (existing) {
    throw new HttpError('This product is already a component of the combo.', 409);
  }

  await repositories.combos.create(productId, input);
  const component = await repositories.combos.findComponent(productId, input.containsProductId);

  if (!component) {
    throw new Error('Product combo creation did not return a component.');
  }

  return toProductComboResponse(component);
}

export async function updateProductComponent(
  productId: string,
  containsProductId: string,
  input: ProductComboUpdateInput,
  repositories: ProductComboServiceRepositories = defaultRepositories,
) {
  await ensureProductExists(productId, repositories);
  const component = await repositories.combos.update(productId, containsProductId, input);
  if (!component) throw new HttpError('Product component not found.', 404);

  const result = await repositories.combos.findComponent(productId, containsProductId);
  if (!result) throw new Error('Product combo update did not return a component.');
  return toProductComboResponse(result);
}

export async function removeProductComponent(
  productId: string,
  containsProductId: string,
  repositories: ProductComboServiceRepositories = defaultRepositories,
) {
  await ensureProductExists(productId, repositories);
  const component = await repositories.combos.delete(productId, containsProductId);
  if (!component) throw new HttpError('Product component not found.', 404);
}

export async function assertProductPriceCanBeUpdated(
  productId: string,
  repositories: Pick<ProductComboServiceRepositories, 'combos'> = defaultRepositories,
) {
  if (await repositories.combos.hasComponents(productId)) {
    throw new HttpError('The selling price of a combo is calculated from its components.', 409);
  }
}
