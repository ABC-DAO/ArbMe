/**
 * Simple hash-based client-side routing
 */

import { ROUTES } from './utils/constants';

type RouteHandler = (params: Record<string, string>) => string;

interface Route {
  pattern: RegExp;
  handler: RouteHandler;
}

const routes: Route[] = [];

/**
 * Register a route
 */
export function route(path: string, handler: RouteHandler): void {
  // Convert path pattern to regex (e.g., /position/:id -> /position/(.+))
  const pattern = new RegExp(
    '^' + path.replace(/:(\w+)/g, '(?<$1>[^/]+)') + '$'
  );
  routes.push({ pattern, handler });
}

/**
 * Navigate to a path
 */
export function navigate(path: string): void {
  window.location.hash = path;
}

/**
 * Render current route
 */
function render(): void {
  const hash = window.location.hash.slice(1) || ROUTES.HOME;
  const app = document.getElementById('app');

  if (!app) {
    console.error('App container not found');
    return;
  }

  // Find matching route
  for (const { pattern, handler } of routes) {
    const match = hash.match(pattern);
    if (match) {
      const params = match.groups || {};
      app.innerHTML = handler(params);
      return;
    }
  }

  // 404
  app.innerHTML = `
    <div class="error-page">
      <h1>404</h1>
      <p>Page not found</p>
      <a href="#${ROUTES.HOME}">Go Home</a>
    </div>
  `;
}

/**
 * Initialize router
 */
export function initRouter(): void {
  window.addEventListener('hashchange', render);
  render(); // Initial render
}

/**
 * Get current route path
 */
export function getCurrentPath(): string {
  return window.location.hash.slice(1) || ROUTES.HOME;
}
