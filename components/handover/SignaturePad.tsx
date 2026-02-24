'use client';

import SignatureCanvas from 'react-signature-canvas';
import { useRef } from 'react';

export function SignaturePad({ onChange }: { onChange: (value: string) => void }) {
  const ref = useRef<SignatureCanvas | null>(null);

  const handleClear = () => {
    ref.current?.clear();
    onChange('');
  };

  const handleEnd = () => {
    if (!ref.current) return;
    if (ref.current.isEmpty()) {
      onChange('');
      return;
    }
    onChange(ref.current.getTrimmedCanvas().toDataURL('image/png'));
  };

  return (
    <div>
      <SignatureCanvas
        ref={ref}
        penColor="black"
        onEnd={handleEnd}
        canvasProps={{ className: 'w-full h-48 border border-dashed border-gray-400 rounded bg-white' }}
      />
      <button
        type="button"
        className="mt-2 rounded bg-gray-200 px-3 py-1 text-sm"
        onClick={handleClear}
      >
        Clear signature
      </button>
    </div>
  );
}
