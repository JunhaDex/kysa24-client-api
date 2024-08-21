import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from '@/resources/noti/noti.entity';
import { UserDevice } from '@/resources/user/user.entity';
import {
  GroupMessageData,
  MessageData,
  NotiType,
  PostMessageData,
  TicketMessageData,
} from '@/resources/noti/noti.type';
import {
  getFirebase,
  sendTargetDevice,
  sendTargetTopic,
} from '@/providers/firebase.provider';
import { DEFAULT_MAX_DEVICE_SAVE } from '@/constants/index.constant';

@Injectable()
export class NotiService {
  constructor(
    @InjectRepository(Notification)
    private readonly notiRepo: Repository<Notification>,
    @InjectRepository(UserDevice)
    private readonly deviceRepo: Repository<UserDevice>,
  ) {}

  async sendNotification(
    recipient: number,
    type: NotiType,
    payload: MessageData,
  ): Promise<void> {
    const noti = this.createNoti({ target: recipient, type, payload });
    const device = await this.deviceRepo.find({
      where: { userId: recipient },
      take: DEFAULT_MAX_DEVICE_SAVE,
    });
    await this.notiRepo.save(noti);
    const fb = await getFirebase();
    await Promise.all(
      device.map((d) => {
        return new Promise((resolve) => {
          sendTargetDevice(d.fcm, fb.token, payload).catch(() => {
            Logger.error(
              `message delivery failed:::: USER: ${d.userId} | ${d.fcm}`,
            );
            this.deviceRepo.delete(d);
          });
          resolve(true);
        });
      }),
    );
  }

  async publishTopic(
    recipients: number[],
    type: NotiType,
    payload: MessageData,
  ): Promise<void> {
    const notiList = recipients.map((r) =>
      this.createNoti({ target: r, type, payload }),
    );
    const topic = notiList[0].type;
    await this.notiRepo.save(notiList);
    const fb = await getFirebase();
    await sendTargetTopic(topic, fb.token, payload);
  }

  createNoti(params: {
    target: number;
    type: NotiType;
    payload: MessageData;
  }): Notification {
    const noti = this.notiRepo.create();
    noti.target = params.target;
    if (params.type === 'post') {
      const postPayload = params.payload as PostMessageData;
      noti.title = '게시물 댓글';
      noti.type = `post__${postPayload.postId}`;
      noti.payload = JSON.stringify(postPayload);
      noti.message = `작성한 게시물에 ${postPayload.authorNickname}님이 댓글을 남겼습니다.`;
    } else if (params.type === 'ticket') {
      const ticketPayload = params.payload as TicketMessageData;
      noti.title = '관심보내기 알림';
      noti.type = `ticket__${ticketPayload.roomRef}`;
      noti.payload = JSON.stringify(ticketPayload);
      noti.message = '누군가 나에게 관심보내기를 보냈습니다! 확인하러 갈까요?';
    } else if (params.type === 'group') {
      const groupPayload = params.payload as GroupMessageData;
      noti.title = '그룹 게시물';
      noti.type = `group__${groupPayload.groupRef}`;
      noti.payload = JSON.stringify(groupPayload);
      noti.message = `${groupPayload.groupName} 그룹에 새로운 게시물이 있습니다.`;
    }
    return noti;
  }
}
