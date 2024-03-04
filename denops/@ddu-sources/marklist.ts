import { GatherArguments } from "https://deno.land/x/ddu_vim@v3.10.2/base/source.ts";
import { Denops, fn } from "https://deno.land/x/ddu_vim@v3.10.2/deps.ts";
import { BaseSource, Item } from "https://deno.land/x/ddu_vim@v3.10.2/types.ts";
import { ActionData } from "https://deno.land/x/ddu_kind_file@v0.7.1/file.ts";
import {
  ActionFlags,
  DduItem,
} from "https://deno.land/x/ddu_vim@v3.6.0/types.ts";

export type Params = {
  buf?: fn.BufNameArg;
  hl_group: string;
};

export class Source extends BaseSource<Params> {
  override kind = "file";
  override actions = {
    // ddu-kind-fileでのopenと同じような挙動をする
    open: async (
      args: { denops: Denops; actionParams: unknown; items: DduItem[] },
    ): Promise<ActionFlags> => {
      const params = args.actionParams as { command: string };
      const openCommand = params.command ?? "edit";
      for (const item of args.items) {
        const action = item.action as ActionData;
        const bufNr = action.bufNr ?? -1;
        const mark = item.data as fn.MarkInformation;
        // open the buffer
        if (bufNr > 0) {
          const isLoaded = await fn.bufloaded(args.denops, bufNr);
          if (!isLoaded) {
            await fn.bufload(args.denops, bufNr);
          }
          await args.denops.cmd(openCommand);
          await args.denops.cmd(`buffer ${bufNr}`);
        } else if (action.path) {
          await args.denops.cmd(`${openCommand} ${action.path}`);
        }
        // move the cursor
        await fn.cursor(args.denops, mark.pos[1], mark.pos[2]);
      }
      return ActionFlags.None;
    },
    // 通常の'aのようなjumpを行う
    jump: async (
      args: { denops: Denops; items: DduItem[] },
    ): Promise<ActionFlags> => {
      for (const item of args.items) {
        const mark = item.data as fn.MarkInformation;
        // TODO: setpos(), cursor(), normal!のどれがいいのか調査しとく
        // await fn.setpos(args.denops, ".", mark.pos);
        await args.denops.cmd("normal! " + mark.mark);
      }
      return ActionFlags.None;
    },
    delete: async (
      args: { denops: Denops; items: DduItem[] },
    ): Promise<ActionFlags> => {
      for (const item of args.items) {
        const mark = item.data as fn.MarkInformation;
        const pos: fn.Position = [
          mark.pos[0],
          0, // if lnum is 0, delete the mark
          0, // col is no longer used to delete the mark
          0,
        ];
        await fn.setpos(args.denops, mark.mark, pos);
      }
      return ActionFlags.RefreshItems;
    },
  };
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
          // ddu-kind-file 0 is special.
          // if bufnum is 0, we use path only.
          // in setpos({expr}, {list}), if bufnum is 0, it means the current buffer
          // in getpos({expr}), if bufnum is 0, it means there is no buffer related to the position
          items.push({
            word: mark.mark + " " + path + ":" + mark.pos[1] + ":" +
              mark.pos[2],
            action: {
              bufNr: mark.pos[0] === 0 ? -1 : mark.pos[0],
              col: mark.pos[2],
              lineNr: mark.pos[1],
              path: path,
            },
            data: mark,
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
