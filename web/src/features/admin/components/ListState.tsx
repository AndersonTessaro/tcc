export function ListState({ loading, error, empty, emptyMessage }: {
  loading: boolean;
  error: string;
  empty: boolean;
  emptyMessage: string;
}) {
  if (loading) return <p role="status" className="py-4 text-gray-500">Carregando...</p>;
  if (error) return <p role="alert" className="py-4 text-red-600">{error}</p>;
  if (empty) return <p className="py-4 text-gray-500">{emptyMessage}</p>;
  return null;
}
