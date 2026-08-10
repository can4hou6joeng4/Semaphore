/* Minimal Node typings for test-only imports. Production sources stay DOM-only;
   `*.test.ts` is excluded from the app typecheck (see tsconfig exclude). */
declare module "node:fs" {
  export function readFileSync(path: string | URL, encoding: string): string;
}
