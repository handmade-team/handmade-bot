import { ChannelOption, RoleOption } from 'necord';
import type { CategoryChannel, Role, TextChannel } from 'discord.js';

export class SetupOptionsDto {
  @RoleOption({
    name: 'team_leader_role',
    description: '팀장 역할',
    required: true,
  })
  team_leader_role: Role;

  @RoleOption({
    name: 'cs_role',
    description: 'CS 담당자 역할',
    required: true,
  })
  cs_role: Role;

  @ChannelOption({
    name: 'ticket_category',
    description: '티켓 채널이 생성될 카테고리',
    required: true,
  })
  ticket_category: CategoryChannel;

  @ChannelOption({
    name: 'archive_category',
    description: '종료된 티켓이 이동할 카테고리',
    required: true,
  })
  archive_category: CategoryChannel;

  @ChannelOption({
    name: 'ticket_channel',
    description: '문의 버튼을 게시할 채널',
    required: true,
  })
  ticket_channel: TextChannel;

  @ChannelOption({
    name: 'log_channel',
    description: '티켓 종료 로그를 저장할 채널',
    required: true,
  })
  log_channel: TextChannel;
}
