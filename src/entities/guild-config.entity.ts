import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('guild_configs')
export class GuildConfig {
  @PrimaryColumn()
  guildId: string;

  @Column({ nullable: true })
  teamLeaderRoleId: string;

  @Column({ nullable: true })
  csRoleId: string;

  @Column({ nullable: true })
  ticketCategoryId: string;

  @Column({ nullable: true })
  archiveCategoryId: string;

  @Column({ nullable: true })
  ticketChannelId: string;

  @Column({ nullable: true })
  ticketMessageId: string;

  @Column({ nullable: true })
  logChannelId: string;

  @Column({ default: 0 })
  ticketCounter: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
