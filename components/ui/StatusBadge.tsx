const colors: Record<string, string> = {
  AVAILABLE: 'bg-green-100 text-green-700',
  ISSUED: 'bg-blue-100 text-blue-700',
  BROKEN: 'bg-red-100 text-red-700',
  LOST: 'bg-yellow-100 text-yellow-700',
  IN_SERVICE: 'bg-purple-100 text-purple-700'
};

export function StatusBadge({ value }: { value: string }) {
  const color = colors[value] || 'bg-gray-100 text-gray-700';
  return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${color}`}>{value}</span>;
}
