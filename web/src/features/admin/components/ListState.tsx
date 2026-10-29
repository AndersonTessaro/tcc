import type { ReactNode } from "react";

export function ListState({ loading, error, empty, emptyMessage, emptyAction }: {
  loading: boolean;
  error: string;
  empty: boolean;
  emptyMessage: string;
  emptyAction?: ReactNode;
}) {
  if (loading) return <p role="status" className="px-4 py-10 text-center text-sm text-ink-faint">Carregando...</p>;
  if (error) return <p role="alert" className="m-4 rounded-lg bg-danger-soft px-4 py-3 text-sm text-danger">{error}</p>;
  if (!empty) return null;
  return (
    <div className="px-4 py-12 text-center">
      <p className="text-sm text-ink-muted">{emptyMessage}</p>
      {emptyAction && <div className="mt-3">{emptyAction}</div>}
    </div>
  );
}
