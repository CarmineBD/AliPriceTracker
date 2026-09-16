import type { AliExpressPublicationPreview, AliExpressStorePreview } from './aliexpress-import.types';

type AliExpressPublicationInfoProps = {
  store: AliExpressStorePreview;
  publication: AliExpressPublicationPreview;
};

const displayValue = (value: string | number | null) => value ?? '—';

export function AliExpressPublicationInfo({ store, publication }: AliExpressPublicationInfoProps) {
  return (
    <div className="grid gap-6 rounded-lg border bg-card p-5 text-sm sm:grid-cols-2">
      <section aria-labelledby="store-preview-title">
        <h3 id="store-preview-title" className="font-medium text-foreground">
          Tienda
        </h3>
        <dl className="mt-3 grid gap-2 text-muted-foreground">
          <div>
            <dt className="sr-only">Nombre</dt>
            <dd>{displayValue(store.name)}</dd>
          </div>
          <div>
            <dt className="inline font-medium text-foreground">Ubicación: </dt>
            <dd className="inline">{displayValue(store.location)}</dd>
          </div>
          <div>
            <dt className="inline font-medium text-foreground">Valoración: </dt>
            <dd className="inline">{displayValue(store.reviewScore)}</dd>
          </div>
          <div>
            <dt className="inline font-medium text-foreground">Ventas (180 días): </dt>
            <dd className="inline">{displayValue(store.sales180d)}</dd>
          </div>
        </dl>
      </section>
      <section aria-labelledby="publication-preview-title">
        <h3 id="publication-preview-title" className="font-medium text-foreground">
          Publicación
        </h3>
        <dl className="mt-3 grid gap-2 text-muted-foreground">
          <div>
            <dt className="sr-only">Nombre</dt>
            <dd className="font-medium text-foreground">{displayValue(publication.name)}</dd>
          </div>
          <div>
            <dt className="inline font-medium text-foreground">ID: </dt>
            <dd className="inline font-mono">{publication.aliexpressProductId}</dd>
          </div>
          <div>
            <dt className="inline font-medium text-foreground">Ventas: </dt>
            <dd className="inline">{displayValue(publication.salesCount)}</dd>
          </div>
          <div>
            <dt className="inline font-medium text-foreground">Valoración: </dt>
            <dd className="inline">{displayValue(publication.reviewScore)}</dd>
            <span aria-hidden="true"> · </span>
            <dt className="inline font-medium text-foreground">Reseñas: </dt>
            <dd className="inline">{displayValue(publication.reviewCount)}</dd>
          </div>
          {publication.url && (
            <div>
              <a
                className="font-medium text-primary underline underline-offset-4"
                href={publication.url}
                target="_blank"
                rel="noreferrer"
              >
                Ver en AliExpress
              </a>
            </div>
          )}
        </dl>
      </section>
    </div>
  );
}
