<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:hatod-project-rules -->
# TDD is mandatory in this project

1. Red → Green → Refactor for every logic change (lib, API routes, server actions).
   Write the failing test first and show RED before writing implementation.
2. Keep business logic in pure, testable functions under `src/lib/`.
   UI components stay thin and delegate to those functions.
3. Purely presentational changes (CSS/responsive) need no unit test, but must
   still pass the full loop: `npm run lint`, `npm test`, `npm run build`.
4. Never merge with failing tests.
<!-- END:hatod-project-rules -->
