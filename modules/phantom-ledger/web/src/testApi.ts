import { vi } from 'vitest';

export function respond(status: number, body?: unknown): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), { status });
}

type Handler = (init: RequestInit | undefined, url: string) => Response | Promise<Response>;

export function stubApi(routes: Record<string, Response | Handler>) {
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    const key = `${init?.method ?? 'GET'} ${url.split('?')[0]}`;
    const route = routes[key];
    if (!route) return respond(404, { error: `no stub for ${key}` });
    return typeof route === 'function' ? route(init, url) : route.clone();
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}
