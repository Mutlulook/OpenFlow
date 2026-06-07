declare global {
  interface Liveblocks {
    Presence: {
      status: "active";
      selectedTaskId?: string | null;
    };
    UserMeta: {
      id: string;
      info: {
        name: string;
        email: string;
        avatar: string;
        color: string;
      };
    };
    ThreadMetadata: {
      taskId?: string;
      boardId?: string;
    };
  }
}

export {
  ClientSideSuspense,
  LiveblocksProvider,
  RoomProvider,
  useOthers,
  useSelf,
  useThreads,
  useUpdateMyPresence,
} from "@liveblocks/react/suspense";
export { useCreateThread } from "@liveblocks/react";
