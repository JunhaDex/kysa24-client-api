export type NotiType = 'post' | 'ticket' | 'group' | 'system';

export interface MessageData {
  title?: string;
  message?: string;
  clickUrl?: string;
}

/**
 * assume when type is post
 */
export interface PostMessageData extends MessageData {
  postId: number;
  authorNickname: string;
}

/**
 * assume when type is ticket
 */
export interface TicketMessageData extends MessageData {
  roomRef: string;
  fromRef: string;
}

/**
 * assume when type is group
 */
export interface GroupMessageData extends MessageData {
  groupRef: string;
  postId: number;
  authorNickname: string;
}
