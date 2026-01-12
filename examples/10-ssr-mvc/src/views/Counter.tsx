import React, { useState } from "react";

export const Counter = ({ initialCount = 0 }: { initialCount?: number }) => {
  const [count, setCount] = useState(initialCount);

  return (
    <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100 text-center max-w-sm mx-auto mt-10">
      <h2 className="text-3xl font-extrabold text-gray-800 mb-2">
        Auto-Hydrated Counter
      </h2>
      <p className="text-gray-500 mb-6">
        This component was bundled <strong>automatically</strong> by Bunstone.
      </p>

      <div className="flex items-center justify-center gap-6 mb-8">
        <button
          onClick={() => setCount(count - 1)}
          className="w-12 h-12 flex items-center justify-center rounded-full bg-red-100 text-red-600 hover:bg-red-200 transition-colors text-2xl font-bold"
        >
          -
        </button>
        <span className="text-5xl font-mono font-bold text-indigo-600 min-w-[3ch]">
          {count}
        </span>
        <button
          onClick={() => setCount(count + 1)}
          className="w-12 h-12 flex items-center justify-center rounded-full bg-green-100 text-green-600 hover:bg-green-200 transition-colors text-2xl font-bold"
        >
          +
        </button>
      </div>

      <button
        onClick={() => setCount(0)}
        className="text-sm text-gray-400 hover:text-indigo-500 underline decoration-dotted underline-offset-4"
      >
        Reset to zero
      </button>
    </div>
  );
};
