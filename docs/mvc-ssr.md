# MVC & SSR (Zero-Config SSR)

Bunstone provides a native, zero-config way to build **React** applications with full interactiviy (useState, useEffect, etc.) using a traditional MVC pattern.

## Getting Started

### 1. Configure the Views Directory

In your `AppStartup.create`, specify the directory where your React components are stored.

```tsx
const app = AppStartup.create(AppModule, {
  viewsDir: "src/views", // Bunstone will scan and bundle everything here
});
```

### 2. Create your Component

Create a `.tsx` or `.jsx` file in your views directory. All exports should be named exactly like the file, or use `default export`.

```tsx
// src/views/Counter.tsx
import React, { useState } from "react";

export const Counter = ({ initialCount = 0 }) => {
  const [count, setCount] = useState(initialCount);

  return (
    <div className="p-4 border rounded shadow">
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>Increment</button>
    </div>
  );
};
```

### 3. Render it from the Controller

Use the `@Render(Component)` decorator. Bunstone will handle the Server-Side Rendering (SSR) and the Client-Side Hydration automatically.

```tsx
import { Controller, Get, Render } from "@grupodiariodaregiao/bunstone";
import { Counter } from "../views/Counter";

@Controller("/")
export class AppController {
  @Get("/")
  @Render(Counter)
  index() {
    // These props are automatically sent to the component
    // on both Server and Client (Hydration)
    return { initialCount: 10 };
  }
}
```

## How it works (The Magic)

Bunstone automates the entire SSR pipeline so you can focus only on your components:

1.  **Automatic Bundling**: On startup, it scans your `viewsDir` and uses `Bun.build` to generate lightweight hydration scripts for every component.
2.  **Server Rendering**: When a route is called, it renders the component to a string on the server for instant page load.
3.  **State Synchronization**: All data returned from your controller is injected into the HTML and automatically picked up by React on the client.
4.  **Instant Interactivity**: The browser downloads the small bundle and React "hydrates" the static HTML, enabling hooks like `useState`.

## Customization

You can return special props from your controller to customize the page:

- `title`: Sets the page `<title>`.
- `description`: Sets the meta description.
- `bundle`: (Optional) If you want to override the automatic bundle for a specific route.

```tsx
@Get("/")
@Render(MyPage)
home() {
  return {
    title: "My Awesome Page",
    myData: "..."
  };
}
```

## Styling

By default, the layout includes **Tailwind CSS** via CDN for quick prototyping. For custom styles, you can add them to the `public/` folder and they will be served automatically.
