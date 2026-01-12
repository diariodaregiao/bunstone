# MVC & SSR (React)

Bunstone provides native support for **Server-Side Rendering (SSR)** using React. Since Bun has built-in support for `.tsx` and `.jsx` files, you can build traditional MVC-style applications with almost zero configuration.

## Features

- **Native JSX/TSX Support**: No build step needed for development.
- **`@Render` Decorator**: Map controller responses to React components (Views).
- **Direct TSX Return**: Return components directly from your methods.
- **Fast Performance**: Powered by Bun's high-performance runtime and Elysia.

## Getting Started

First, ensure you have the necessary dependencies:

```bash
bun add react react-dom
```

### 1. Direct JSX Return

The simplest way to use SSR is to return a JSX element directly from a controller method. Bunstone automatically detects the return type and sets the `Content-Type` to `text/html`.

```tsx
import { Controller, Get } from "@diariodaregiao/bunstone";

@Controller("hello")
export class HelloController {
  @Get()
  index() {
    return (
      <main>
        <h1>Hello from SSR!</h1>
        <p>This is rendered on the server.</p>
      </main>
    );
  }
}
```

### 2. Using the `@Render` Decorator (MVC Pattern)

For a cleaner MVC separation, you can use the `@Render` decorator. This allows you to return a plain object (the **Model**) which will be passed as `props` to your React component (the **View**).

#### Create your View (Component)

```tsx
// views/Welcome.tsx
import React from "react";

export interface WelcomeProps {
  name: string;
}

export const Welcome: React.FC<WelcomeProps> = ({ name }) => (
  <div>
    <h1>Welcome, {name}!</h1>
  </div>
);
```

#### Map it in the Controller

```tsx
import { Controller, Get, Render } from "@diariodaregiao/bunstone";
import { Welcome } from "./views/Welcome";

@Controller("welcome")
export class WelcomeController {
  @Get()
  @Render(Welcome)
  index() {
    // This object is passed as props to the Welcome component
    return { name: "John Doe" };
  }
}
```

## Using Layouts

Bunstone provides a base `Layout` component to help you structure your HTML documents consistently. It includes a basic HTML5 skeleton and supports TailwindCSS via CDN by default.

```tsx
import { Controller, Get, Render, Layout } from "@diariodaregiao/bunstone";

const HomePage = ({ title }: { title: string }) => (
  <Layout title={title}>
    <div className="p-4 bg-white rounded shadow">
      <h1 className="text-2xl font-bold">My Awesome App</h1>
      <p>Content goes here...</p>
    </div>
  </Layout>
);

@Controller()
export class HomeController {
  @Get()
  @Render(HomePage)
  index() {
    return { title: "Home Page" };
  }
}
```

## Configuration

To use `.tsx` in your controllers and enable MVC features, ensure your `tsconfig.json` includes these settings:

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "react",
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```
