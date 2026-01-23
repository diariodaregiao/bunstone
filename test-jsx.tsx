import React from "react";
import { Layout } from "./lib/components/layout";

// A simple React component for our Page
export const WelcomePage: React.FC<{ name: string; items: string[] }> = ({
  name,
  items,
}) => {
  return (
    <Layout title="Welcome to Bunstone SSR">
      <div className="bg-white shadow rounded-lg p-6">
        <h1 className="text-3xl font-bold text-blue-600 mb-4">
          Hello, {name}!
        </h1>
        <p className="text-gray-600 mb-6">
          This page was rendered on the server using React and Bun.
        </p>

        <h2 className="text-xl font-semibold mb-2">Features implemented:</h2>
        <ul className="list-disc list-inside space-y-1">
          {items.map((item, i) => (
            <li key={i} className="text-gray-700">
              {item}
            </li>
          ))}
        </ul>

        <div className="mt-8 pt-6 border-t border-gray-100">
          <a href="/" className="text-blue-500 hover:text-blue-700 font-medium">
            &larr; Back to home
          </a>
        </div>
      </div>
    </Layout>
  );
};
