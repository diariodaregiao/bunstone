
import React from 'react';
import { hydrateRoot } from 'react-dom/client';
import * as Mod from '/home/filipi.oliveira@gdc.local/poc/diario-dip/examples/10-ssr-mvc/src/views/Counter.tsx';

const Component = Mod['Counter'] || Mod.default;

function hydrate() {
  const dataElement = document.getElementById("__BUNSTONE_DATA__");
  const data = dataElement ? JSON.parse(dataElement.textContent || "{}") : {};

  if (typeof document !== 'undefined' && Component) {
    const root = document.getElementById("root");
    if (root) {
      try {
        hydrateRoot(root, React.createElement(Component, data));
        console.log('[Bunstone] Hydration successful for component: Counter');
      } catch (e) {
        console.error('[Bunstone] Hydration failed for component: Counter', e);
      }
    } else {
      console.error('[Bunstone] Root element "root" not found for hydration.');
    }
  } else {
    console.error('[Bunstone] Component Counter not found in bundle.');
  }
}

// Ensure DOM is fully loaded before hydrating
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', hydrate);
} else {
  hydrate();
}
        