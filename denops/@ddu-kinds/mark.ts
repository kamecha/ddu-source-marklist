import { BaseKind } from "https://deno.land/x/ddu_vim@v3.10.2/base/kind.ts";
import { Denops, fn } from "https://deno.land/x/ddu_vim@v3.10.2/deps.ts";
import {
  ActionFlags,
  DduItem,
} from "https://deno.land/x/ddu_vim@v3.10.2/types.ts";

export type ActionData = {
  bufNr?: number;
  col?: number;
  lineNr?: number;
  path?: string;
};

export type Params = Record<never, never>;

export class Kind extends BaseKind<Params> {
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
    // 該当するバッファと紐づくウィンドウへ移動して、カーソルを移動する
    // 該当ウィンドウが複数ある場合はpushして、ウィンドウソースっぽくしてもよいかも
    // ウィンドウに移動した後に、jumpと同じ要領で移動する
    goto: (): ActionFlags => ActionFlags.None,
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
  override params(): Params {
    return {};
  }
}
