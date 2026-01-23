import React, { useState } from "react";

export const Welcome = ({ message, timestamp }: { message: string, timestamp: string }) => {
  const [count, setCount] = useState(0);

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-xl shadow-md border border-gray-200 text-center">
      <h1 className="text-3xl font-bold text-indigo-600 mb-2">Bunstone MVC</h1>
      <p className="text-gray-600 mb-6">{message}</p>
      
      <div className="bg-indigo-50 p-4 rounded-lg mb-6">
        <p className="text-sm text-indigo-400 mb-2 font-mono">Interactive Hooks Example</p>
        <div className="flex items-center justify-center gap-4">
            <button 
                onClick={() => setCount(count - 1)}
                className="bg-white border border-indigo-200 px-3 py-1 rounded shadow-sm hover:bg-indigo-100"
            >-</button>
            <span className="text-2xl font-mono font-bold text-indigo-700 min-w-[2ch]">{count}</span>
            <button 
                onClick={() => setCount(count + 1)}
                className="bg-white border border-indigo-200 px-3 py-1 rounded shadow-sm hover:bg-indigo-100"
            >+</button>
        </div>
      </div>

      <p className="text-gray-400 text-xs italic">Server time: {timestamp}</p>
    </div>
  );
};
