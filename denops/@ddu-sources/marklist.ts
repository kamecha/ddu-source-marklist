import { GatherArguments } from "https://deno.land/x/ddu_vim@v3.10.2/base/source.ts";
import { fn } from "https://deno.land/x/ddu_vim@v3.10.2/deps.ts";
import { BaseSource, Item } from "https://deno.land/x/ddu_vim@v3.10.2/types.ts";
import { ActionData } from "https://deno.land/x/ddu_kind_file@v0.7.1/file.ts";

export type Params = Record<never, never>;

export class Source extends BaseSource<Params> {
  override kind = "file";
  override gather(
    args: GatherArguments<Params>,
  ): ReadableStream<Item<ActionData>[]> {
    return new ReadableStream({
      async start(controller) {
        const items: Item<ActionData>[] = [];
        const marklist: fn.MarkInformation[] = await fn.getmarklist(
          args.denops,
        );
        for (const mark of marklist) {
          items.push({
            word: mark.mark + " " + mark.file + ":" + mark.pos[1] + ":" +
              mark.pos[2],
            action: {
              bufNr: mark.pos[0],
              col: mark.pos[2],
              lineNr: mark.pos[1],
              path: mark.file,
            },
          });
        }
        controller.enqueue(items);
        controller.close();
      },
    });
  }
  override params(): Params {
    return {};
  }
}
