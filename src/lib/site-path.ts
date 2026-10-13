function basePath(): string {
  return (process.env.NEXT_PUBLIC_BASE_PATH ?? '').replace(/\/+$/, '');
}

/** Prefix public files for a subpath deployment while preserving external URLs. */
export function sitePath(path: string): string {
  const base = basePath();
  if (!base || !path.startsWith('/') || path.startsWith('//') || path === base ||
    path.startsWith(`${base}/`) || path.startsWith(`${base}?`) || path.startsWith(`${base}#`)) return path;
  return `${base}${path}`;
}

/** Let asset selection use the same source names on root and subpath hosts. */
export function stripBasePath(path: string): string {
  const base = basePath();
  return base && path.startsWith(`${base}/`) ? path.slice(base.length) : path;
}
