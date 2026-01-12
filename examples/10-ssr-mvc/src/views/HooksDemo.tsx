import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";

export interface HooksDemoProps {
  initialMessage?: string;
}

export const HooksDemo = ({
  initialMessage = "Hello from Server!",
}: HooksDemoProps) => {
  // useState hook
  const [message, setMessage] = useState(initialMessage);
  const [count, setCount] = useState(0);
  const [isClient, setIsClient] = useState(false);

  // useRef hook
  const renderCount = useRef(0);
  renderCount.current++;

  // useEffect hook - runs only on client after hydration
  useEffect(() => {
    setIsClient(true);
    console.log("[HooksDemo] useEffect executed - component hydrated!");

    // Cleanup function
    return () => {
      console.log("[HooksDemo] Cleanup on unmount");
    };
  }, []);

  // useEffect with dependency
  useEffect(() => {
    if (isClient) {
      document.title = `Count: ${count}`;
    }
  }, [count, isClient]);

  // useCallback hook
  const increment = useCallback(() => {
    setCount((prev) => prev + 1);
  }, []);

  const decrement = useCallback(() => {
    setCount((prev) => prev - 1);
  }, []);

  // useMemo hook
  const doubledCount = useMemo(() => {
    console.log("[HooksDemo] useMemo recalculating doubledCount");
    return count * 2;
  }, [count]);

  const isEven = useMemo(() => count % 2 === 0, [count]);

  return (
    <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100 max-w-lg mx-auto mt-10">
      <h2 className="text-3xl font-extrabold text-gray-800 mb-2">
        React Hooks Demo
      </h2>

      {/* Hydration Status */}
      <div
        className={`mb-6 p-4 rounded-lg ${
          isClient
            ? "bg-green-100 text-green-800"
            : "bg-yellow-100 text-yellow-800"
        }`}
      >
        <p className="font-semibold">
          {isClient
            ? "✅ Hydrated - Hooks are active!"
            : "⏳ Server Rendered - Waiting for hydration..."}
        </p>
        <p className="text-sm mt-1">Render count: {renderCount.current}</p>
      </div>

      {/* Message from props */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Message (from server props):
        </label>
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          placeholder="Type to test useState..."
        />
      </div>

      {/* Counter with hooks */}
      <div className="mb-6">
        <p className="text-gray-600 mb-4">
          <strong>useState + useCallback:</strong>
        </p>
        <div className="flex items-center justify-center gap-6">
          <button
            onClick={decrement}
            className="w-12 h-12 flex items-center justify-center rounded-full bg-red-100 text-red-600 hover:bg-red-200 transition-colors text-2xl font-bold"
          >
            -
          </button>
          <span className="text-5xl font-mono font-bold text-indigo-600 min-w-[3ch]">
            {count}
          </span>
          <button
            onClick={increment}
            className="w-12 h-12 flex items-center justify-center rounded-full bg-green-100 text-green-600 hover:bg-green-200 transition-colors text-2xl font-bold"
          >
            +
          </button>
        </div>
      </div>

      {/* useMemo results */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <p className="text-gray-600">
          <strong>useMemo results:</strong>
        </p>
        <ul className="mt-2 space-y-1 text-sm">
          <li>
            Doubled count:{" "}
            <span className="font-mono font-bold text-indigo-600">
              {doubledCount}
            </span>
          </li>
          <li>
            Is even:{" "}
            <span
              className={`font-bold ${
                isEven ? "text-green-600" : "text-red-600"
              }`}
            >
              {isEven ? "Yes" : "No"}
            </span>
          </li>
        </ul>
      </div>

      {/* useEffect indicator */}
      <div className="mt-6 text-center text-sm text-gray-500">
        <p>💡 useEffect updates document.title with current count</p>
        <p>Check your browser tab!</p>
      </div>
    </div>
  );
};
