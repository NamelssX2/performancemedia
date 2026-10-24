# Worker integration

At the top of your existing `src/index.js`:
```js
import { handleAdminApi } from "./admin-api.js";
```
Inside the existing `fetch(request, env, ctx)` handler, before generic API routing/static asset fallback:
```js
const adminResponse = await handleAdminApi(request, env);
if (adminResponse) return adminResponse;
```
Keep your current `export default` and public API routes. This helper exports only a named function.
