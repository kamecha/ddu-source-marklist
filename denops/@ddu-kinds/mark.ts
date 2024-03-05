import {
  BaseKind,
  GetPreviewerArguments,
} from "https://deno.land/x/ddu_vim@v3.10.2/base/kind.ts";
import { Denops, fn } from "https://deno.land/x/ddu_vim@v3.10.2/deps.ts";
import {
  ActionFlags,
  BufferPreviewer,
  Context,
  DduItem,
  Previewer,
} from "https://deno.land/x/ddu_vim@v3.10.2/types.ts";

export type ActionData = {
  winid?: number;
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
      args: { denops: Denops; context: Context; items: DduItem[] },
    ): Promise<ActionFlags> => {
      for (const item of args.items) {
        const mark = item.data as fn.MarkInformation;
        // TODO: setpos(), cursor(), normal!のどれがいいのか調査しとく
        if (mark.pos[0] < 0) {
          // 'A : 大文字マーク
          // '0 : 番号マーク
          // ↑のうちバッファが無いもの
          await args.denops.cmd("normal! " + mark.mark);
        } else {
          // 'a : 小文字マーク
          // 'A : 大文字マーク
          // '0 : 番号マーク
          // ↑のうちバッファが有るもの
          if (mark.pos[0] !== args.context.bufNr) {
            await args.denops.cmd(`buffer ${mark.pos[0]}`);
          }
          // setpos()君カーソルを移動させる時はバッファ番号を無視するらしい:awoo:
          await fn.setpos(args.denops, ".", mark.pos);
        }
      }
      return ActionFlags.None;
    },
    // 該当するバッファと紐づくウィンドウへ移動して、カーソルを移動する
    // 該当ウィンドウが複数ある場合はpushして、ウィンドウソースっぽくしてもよいかも
    // ウィンドウに移動した後に、jumpと同じ要領で移動する
    goto: async (
      args: { denops: Denops; items: DduItem[] },
    ): Promise<ActionFlags> => {
      for (const item of args.items) {
        const action = item.action as ActionData;
        const mark = item.data as fn.MarkInformation;
        if (action.winid) {
          await fn.win_gotoid(args.denops, action.winid);
        }
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
  override params(): Params {
    return {};
  }
  override getPreviewer(
    args: GetPreviewerArguments,
  ): Promise<Previewer | undefined> {
    const action = args.item.action as ActionData;
    if (!action) {
      return Promise.resolve(undefined);
    }
    const previewer: BufferPreviewer = {
      kind: "buffer",
      expr: action.bufNr === -1 ? undefined : action.bufNr,
      path: action.path,
      lineNr: action.lineNr,
    };
    return Promise.resolve(previewer);
  }
}
