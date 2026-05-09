import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum InquiryType {
  SYSTEM = 'system_inquiry',
  SERVER = 'server_inquiry',
  LAUNCHER = 'launcher_inquiry',
  SKIN = 'skin_inquiry',
  BUILD = 'build_inquiry',
  PLAN = 'plan_inquiry',
  STORY = 'story_inquiry',
  BGM = 'bgm_inquiry',
  DESIGN = 'design_inquiry',
  ILLUST = 'illust_inquiry',
  OTHER = 'other_inquiry',
}

export enum TicketStatus {
  REVIEWING = '검토중',
  AWAITING = '답변대기',
  QUOTE_SENT = '견적안내완료',
  ASSIGNING = '작업자배정중',
  CONFIRMED = '진행확정',
  ON_HOLD = '보류',
  REJECTED = '거절',
  CLOSED = '종료',
}

@Entity('tickets')
export class Ticket {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  guildId: string;

  @Column()
  ticketNumber: number;

  @Column()
  requesterId: string;

  @Column()
  requesterTag: string;

  @Column()
  ticketChannelId: string;

  @Column({ type: 'text' })
  inquiryType: InquiryType;

  @Column({ type: 'text', default: TicketStatus.REVIEWING })
  status: TicketStatus;

  @Column({ type: 'text', nullable: true })
  invitedWorkerIds: string; // JSON 배열

  @Column({ type: 'text', nullable: true })
  formData: string; // JSON

  @CreateDateColumn()
  createdAt: Date;

  @Column({ nullable: true })
  closedAt: Date;
}
