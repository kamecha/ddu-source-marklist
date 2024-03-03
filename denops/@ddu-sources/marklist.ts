import { GatherArguments } from "https://deno.land/x/ddu_vim@v3.10.2/base/source.ts";
import { BaseSource, Item } from "https://deno.land/x/ddu_vim@v3.10.2/types.ts";

export type Params = Record<never, never>;

export class Source extends BaseSource<Params> {
  gather({}: GatherArguments<Params>): ReadableStream<Item<unknown>[]> {
    throw new Error("Method not implemented.");
  }
  params(): Params {
    throw new Error("Method not implemented.");
  }
}
