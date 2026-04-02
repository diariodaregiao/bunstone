
import React from 'react';
import { hydrateRoot } from 'react-dom/client';
import * as Mod from '../examples/10-ssr-mvc/src/views/HooksDemo';

const Component = Mod.HooksDemo;

function hydrate() {
  const dataElement = document.getElementById("__BUNSTONE_DATA__");
  const data = dataElement ? JSON.parse(dataElement.textContent || "{}") : {};

  if (typeof document !== 'undefined' && Component) {
    const root = document.getElementById("root");
    if (root) {
      try {
        hydrateRoot(root, React.createElement(Component, data));
        console.log('[Bunstone] Hydration successful for component: HooksDemo');
      } catch (e) {
        console.error('[Bunstone] Hydration failed for component: HooksDemo', e);
      }
    } else {
      console.error('[Bunstone] Root element "root" not found for hydration.');
    }
  } else {
    console.error('[Bunstone] Component HooksDemo not found in bundle.');
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', hydrate);
} else {
  hydrate();
}
