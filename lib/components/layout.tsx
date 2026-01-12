import React from "react";

export interface LayoutProps {
  title?: string;
  children: React.ReactNode;
  data?: any;
  bundle?: string;
}

export const Layout: React.FC<LayoutProps> = ({
  title,
  children,
  data,
  bundle,
}) => {
  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{title || "Bunstone App"}</title>
        <script src="https://cdn.tailwindcss.com"></script>
        {bundle && <script type="module" src={`/public/${bundle}`}></script>}
      </head>
      <body className="bg-gray-100 text-gray-900 font-sans">
        <main id="root" className="container mx-auto p-4">
          {children}
        </main>
        {data && (
          <script
            id="__BUNSTONE_DATA__"
            type="application/json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
          />
        )}
      </body>
    </html>
  );
};
