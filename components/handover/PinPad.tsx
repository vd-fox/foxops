'use client';

const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];

export function PinPad({ value, onChange }: { value: string; onChange: (next: string) => void }) {
  const handlePress = (digit: string) => {
    if (value.length >= 6) return;
    onChange(value + digit);
  };

  const remove = () => {
    onChange(value.slice(0, -1));
  };

  return (
    <div>
      <div className="mb-3 flex justify-center gap-2 text-3xl">
        {Array.from({ length: 6 }).map((_, idx) => (
          <span key={idx} className="h-5 w-5 rounded-full border border-gray-400 text-center">
            {value[idx] ? '•' : ' '}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-3">
        {digits.map((digit) => (
          <button
            key={digit}
            type="button"
            onClick={() => handlePress(digit)}
            className="rounded bg-gray-200 py-4 text-2xl font-semibold"
          >
            {digit}
          </button>
        ))}
        <button type="button" onClick={() => onChange('')} className="rounded bg-red-200 py-4 font-semibold">
          Clear
        </button>
        <button type="button" onClick={remove} className="rounded bg-gray-300 py-4 font-semibold">
          ←
        </button>
      </div>
    </div>
  );
}
