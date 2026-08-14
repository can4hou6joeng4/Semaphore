/* Minimal Node typings for test-only imports. Production sources stay DOM-only.
   These ARE type-checked by `npm run build`: tsconfig has no `exclude` and
   includes all of `src`, so a test-only Node API used without a declaration
   here fails the build. */
declare module "node:fs" {
  export function readFileSync(path: string | URL, encoding: string): string;
  export function readdirSync(path: string | URL): string[];
}
