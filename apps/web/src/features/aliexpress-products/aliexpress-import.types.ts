import type {
  AliExpressProductLookup,
  AliExpressProductVariant,
  AliExpressPublication,
  AliExpressStore,
  ProductOption,
} from '@alitracker/shared';

export type AliExpressStorePreview = AliExpressStore;
export type AliExpressPublicationPreview = AliExpressPublication;
export type AliExpressSkuPreview = AliExpressProductVariant;
export type AliExpressPublicationPreviewResult = AliExpressProductLookup;
export type { ProductOption };

export type SkuProductAssociations = Record<string, string | undefined>;
