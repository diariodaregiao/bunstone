import React from "react";

export interface LayoutProps {
  title?: string;
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ title, children }) => {
  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{title || "Bunstone App"}</title>
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body className="bg-gray-100 text-gray-900 font-sans">
        <main className="container mx-auto p-4">{children}</main>
      </body>
    </html>
  );
};
