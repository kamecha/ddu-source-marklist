import { BaseKind } from "https://deno.land/x/ddu_vim@v3.10.2/base/kind.ts";

export type Params = Record<never, never>;

export class Kind extends BaseKind<Params> {
  params(): Params {
    throw new Error("Method not implemented.");
  }
}
