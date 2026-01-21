## Plan: MVC SSR with React (TSX) and Bun

This plan describes how to implement a Model-View-Controller (MVC) pattern for Server-Side Rendering (SSR) in the `bunstone` framework. We will leverage Bun's native TSX support and the `@elysiajs/html` plugin to render React components directly from controllers.

### Steps

1. **Install SSR dependencies**
   Add `react`, `react-dom`, and `@elysiajs/html` to [package.json](package.json) to enable React rendering and HTML response handling in Elysia.

2. **Register HTML plugin**
   Modify `static create` in [lib/app-startup.ts](lib/app-startup.ts#L47) to use the `html()` plugin from `@elysiajs/html`, allowing the server to recognize and return JSX/TSX elements as HTML.

3. **Create @Render decorator**
   Implement a new decorator in [lib/render.ts](lib/render.ts) (create this file) to store component metadata using `reflect-metadata`, enabling an MVC "View" mapping.

4. **Update controller execution logic**
   Enhance `executeControllerMethod` in [lib/app-startup.ts](lib/app-startup.ts#L101) to check for `@Render` metadata; if present, it should use `React.createElement` to wrap the controller's return data (Model) into the specified component (View).

5. **Provide a Base Layout**
   Create a standard `Layout` component in `lib/components/layout.tsx` to provide a consistent HTML structure (head, body, etc.) for all rendered pages.

6. **Add SSR example**
   Create a new example in [examples/09-ssr/index.ts](examples/09-ssr/index.ts) demonstrating a controller returning a TSX component using the new MVC structure.

### Further Considerations

1. **React version?** Bun works best with React 18+. I recommend using `react` and `react-dom` as peer dependencies if this is a library for others.
2. **Global layout?** Should the `@Render` decorator allow a global layout configuration or should each controller/method specify its own? I recommend a default layout option in `AppStartup`.
3. **Hydration?** This plan covers SSR (static HTML). If interactivity is needed, you would need a client-side hydration strategy (bundling assets).
