import * as path from 'node:path';

import { Router } from 'express';
import asyncHandler from 'express-async-handler';

import { HttpStatusError } from '@prairielearn/error';

import { config } from '../../lib/config.js';
import { APP_ROOT_PATH } from '../../lib/paths.js';

const EXTENSION_WHITELIST = ['.js', '.mjs'];

/**
 * Serves shared ES module JavaScript files for use by element scripts.
 * These are system-level modules stored in `src/element-modules/`.
 * No per-course authorization is required.
 */
export default function () {
  const router = Router({ mergeParams: true });
  router.get(
    '/*',
    asyncHandler(async (req, res) => {
      const filename = req.params[0];
      const valid = EXTENSION_WHITELIST.some((ext) => filename.endsWith(ext));
      if (!valid) {
        throw new HttpStatusError(404, 'Unable to serve that file');
      }

      // If the route includes a `cachebuster` param, we'll set the `immutable`
      // and `maxAge` options on the `Cache-Control` header. This router is
      // mounted twice - one with the cachebuster in the URL, and once without
      // for backwards compatibility. See `server.ts` for more details.
      //
      // As with `/assets/`, we assume that element modules are likely to change
      // when running in dev mode, so we skip caching entirely in that case.
      const isCached = !!req.params.cachebuster && !config.devMode;
      const sendFileOptions = {
        immutable: isCached,
        maxAge: isCached ? '31536000s' : 0,
      };

      if (isCached) {
        // `middlewares/cors.js` disables caching for all routes by default.
        // We need to remove this header so that `res.sendFile` can set it
        // correctly.
        res.removeHeader('Cache-Control');
      }

      const elementModulesDir = path.join(APP_ROOT_PATH, 'src', 'element-modules');
      res.sendFile(filename, { root: elementModulesDir, ...sendFileOptions });
    }),
  );
  return router;
}
