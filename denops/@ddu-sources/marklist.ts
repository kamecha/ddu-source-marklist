import { GatherArguments } from "https://deno.land/x/ddu_vim@v3.10.2/base/source.ts";
import { fn } from "https://deno.land/x/ddu_vim@v3.10.2/deps.ts";
import { BaseSource, Item } from "https://deno.land/x/ddu_vim@v3.10.2/types.ts";
import { ActionData } from "https://deno.land/x/ddu_kind_file@v0.7.1/file.ts";

export type Params = {
  buf?: fn.BufNameArg;
  hl_group: string;
};

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
          args.sourceParams.buf,
        );
        for (const mark of marklist) {
          const path = mark.file ?? await fn.bufname(args.denops, mark.pos[0]);
          const action: ActionData = {
            col: mark.pos[2],
            lineNr: mark.pos[1],
            path: path,
          };
          // ddu-kind-file 0 is special.
          // if bufnum is 0, we use path only.
          // in setpos({expr}, {list}), if bufnum is 0, it means the current buffer
          // in getpos({expr}), if bufnum is 0, it means there is no buffer related to the position
          if (mark.pos[0] !== 0) {
            action.bufNr = mark.pos[0];
          }
          items.push({
            word: mark.mark + " " + path + ":" + mark.pos[1] + ":" +
              mark.pos[2],
            action: action,
            highlights: [
              {
                name: "ddu-source-marklist-header",
                hl_group: args.sourceParams.hl_group,
                col: 1,
                width: mark.mark.length,
              },
            ],
          });
        }
        controller.enqueue(items);
        controller.close();
      },
    });
  }
  override params(): Params {
    return {
      hl_group: "Special",
    };
  }
}
