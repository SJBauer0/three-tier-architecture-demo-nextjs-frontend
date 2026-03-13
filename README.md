# Frontend — Deployment Guide

## Overview

This is a **Next.js** (React) web application that provides the user interface for the demo. It communicates with the backend exclusively through **server-side proxy routes** — the backend URL is never exposed to the browser.

---

## Runtime

- **Node.js** 22+
- **Package manager:** pnpm

---

## Building and running locally

```bash
# Install dependencies
pnpm install

# Build the application
pnpm build

# Run in production mode
pnpm start
```

For development with hot-reload:

```bash
pnpm dev
```

---

## Environment variables

| Variable                  | Required      | Default                   | Description                                                                                                                                                       |
| ------------------------- | ------------- | ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `INTERNAL_API_BASE_URL` | **Yes** | `http://localhost:3001` | Base URL of the backend service, resolved**server-side only**. In a container environment, use the internal service address (e.g. `http://backend:3001`). |
| `PORT`                  | No            | `3000`                  | Port the server listens on                                                                                                                                        |
| `POD_NAME`              | No            | —                        | Identifier of the current instance/pod. Displayed in the UI for observability.                                                                                    |
| `POD_IP`                | No            | —                        | IP address of the current instance/pod. Displayed in the UI for observability.                                                                                    |
| `NODE_NAME`             | No            | —                        | Hostname of the underlying node/host. Displayed in the UI for observability.                                                                                      |

> `POD_NAME`, `POD_IP`, and `NODE_NAME` are optional and purely cosmetic — the application works without them. They are designed to be injected by the infrastructure (e.g. Kubernetes Downward API or EC2 instance metadata) to demonstrate load balancing across replicas.

---

## Exposed port

**3000** (default, overridable via `PORT`)

---

## Health check

```text
GET /
```

The root path returns the main page. Use it for container/infrastructure health probes.

---

## Containerization considerations

- Next.js supports a [standalone output mode](https://nextjs.org/docs/app/api-reference/config/next-config-js/output) that produces a self-contained server bundle — this significantly reduces the final image size and is the recommended approach for containerization.
- A multi-stage Docker build is strongly recommended: build in one stage, copy only the production output to the final image.
- `INTERNAL_API_BASE_URL` is a **server-side** variable. It does not need `NEXT_PUBLIC_` prefix and must **not** be baked into the image — inject it at runtime so the same image can be used in any environment.
- No external volumes or persistent storage are needed.

---

## Architecture note — proxy pattern

All calls from the browser to the backend go through Next.js server-side API routes (`/api/proxy/*`). This means:

- The frontend container must be able to reach the backend container over the network at `INTERNAL_API_BASE_URL`.
- The backend does **not** need to be publicly accessible — only the frontend does.
- Your infrastructure only needs one public entry point (the frontend).
