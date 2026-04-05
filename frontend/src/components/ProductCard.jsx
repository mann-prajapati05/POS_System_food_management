import { useMemo, useState } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8088';

function getProductImageSrc(product) {
  const raw = product?.image_path || product?.image_url || '';
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return raw;
  return `${API_BASE_URL}${raw.startsWith('/') ? '' : '/'}${raw}`;
}

export default function ProductCard({ product, onAdd, disabled = false }) {
  const [broken, setBroken] = useState(false);
  const imageSrc = useMemo(() => getProductImageSrc(product), [product]);
  const showImage = imageSrc && !broken;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onAdd(product)}
      className="flex w-full flex-col rounded-linen-lg border border-linen-border bg-white p-4 text-left transition-all duration-150 hover:border-linen-primary active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {showImage ? (
        <img
          src={imageSrc}
          alt={product.name}
          onError={() => setBroken(true)}
          className="mb-3 h-28 w-full rounded-linen object-cover"
          loading="lazy"
        />
      ) : (
        <div className="mb-3 flex h-28 w-full items-center justify-center rounded-linen bg-linen-surface-2 text-xs font-medium text-linen-text-muted">
          No Image
        </div>
      )}

      <p className="text-[13px] font-medium text-linen-text-primary">{product.name}</p>
      <p className="mt-0.5 text-[11px] text-linen-text-muted">{product.category_name}</p>
      {product.description && (
        <p className="mt-2 line-clamp-2 text-xs text-linen-text-secondary">{product.description}</p>
      )}
      <p className="mt-auto pt-3 font-mono text-base font-bold text-linen-text-primary">
        ${Number(product.price || 0).toFixed(2)}
      </p>
    </button>
  );
}
