interface Env {
  ASSETS: Fetcher;
  API_ORIGIN: string;
}

export function toApiRequest(request: Request, apiOrigin: string): Request {
  const incoming = new URL(request.url);
  const upstream = new Request(new URL(incoming.pathname + incoming.search, apiOrigin), request);
  upstream.headers.set('X-Forwarded-Host', incoming.host);
  upstream.headers.set('X-Forwarded-Proto', incoming.protocol.slice(0, -1));
  return upstream;
}

export default {
  async fetch(request, env) {
    if (new URL(request.url).pathname.startsWith('/api/')) {
      return fetch(toApiRequest(request, env.API_ORIGIN));
    }
    return env.ASSETS.fetch(request);
  },

  async scheduled(_controller, env, ctx) {
    ctx.waitUntil(
      fetch(`${env.API_ORIGIN}/actuator/health/liveness`).then((response) => {
        console.log(`keep-warm liveness ${response.status}`);
      }),
    );
  },
} satisfies ExportedHandler<Env>;
