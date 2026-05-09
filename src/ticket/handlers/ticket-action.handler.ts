import { Injectable } from '@nestjs/common';
import { Button, Context, StringSelect, UserSelect } from 'necord';
import type { ButtonContext, StringSelectContext, UserSelectContext } from 'necord';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  MessageFlags,
  StringSelectMenuBuilder,
  TextChannel,
  UserSelectMenuBuilder,
} from 'discord.js';
import { TicketService } from '../ticket.service';
import { TicketStatus } from '../../entities/ticket.entity';

const STATUS_OPTIONS = [
  { label: '검토중', value: TicketStatus.REVIEWING },
  { label: '답변대기', value: TicketStatus.AWAITING },
  { label: '견적안내완료', value: TicketStatus.QUOTE_SENT },
  { label: '작업자배정중', value: TicketStatus.ASSIGNING },
  { label: '진행확정', value: TicketStatus.CONFIRMED },
  { label: '보류', value: TicketStatus.ON_HOLD },
  { label: '거절', value: TicketStatus.REJECTED },
  { label: '종료', value: TicketStatus.CLOSED },
];

@Injectable()
export class TicketActionHandler {
  constructor(private readonly ticketService: TicketService) {}

  private async hasAccess(interaction: ButtonContext[0] | StringSelectContext[0] | UserSelectContext[0]): Promise<boolean> {
    if (!interaction.guild || !interaction.member) return false;
    const config = await this.ticketService.getOrCreateGuildConfig(interaction.guild.id);
    const roles = interaction.member.roles;
    const roleIds = Array.isArray(roles) ? roles : [...roles.cache.keys()];
    return roleIds.includes(config.teamLeaderRoleId) || roleIds.includes(config.csRoleId);
  }

  // ─── 상태 변경 ──────────────────────────────────────────────────

  @Button('ticket_status')
  async onTicketStatus(@Context() [interaction]: ButtonContext) {
    if (!await this.hasAccess(interaction)) {
      await interaction.reply({ content: '권한이 없습니다.', flags: MessageFlags.Ephemeral });
      setTimeout(() => interaction.deleteReply().catch(() => {}), 5000);
      return;
    }

    const select = new StringSelectMenuBuilder()
      .setCustomId('select_ticket_status')
      .setPlaceholder('변경할 상태를 선택해주세요')
      .addOptions(STATUS_OPTIONS);

    await interaction.reply({
      components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select)],
      flags: MessageFlags.Ephemeral,
    });
  }

  @StringSelect('select_ticket_status')
  async onSelectTicketStatus(@Context() [interaction]: StringSelectContext) {
    if (!await this.hasAccess(interaction)) {
      await interaction.reply({ content: '권한이 없습니다.', flags: MessageFlags.Ephemeral });
      setTimeout(() => interaction.deleteReply().catch(() => {}), 5000);
      return;
    }

    const newStatus = interaction.values[0] as TicketStatus;
    const ticket = await this.ticketService.getTicketByChannelId(interaction.channelId);

    if (!ticket) {
      await interaction.reply({ content: '티켓 정보를 찾을 수 없습니다.', flags: MessageFlags.Ephemeral });
      return;
    }

    await this.ticketService.updateTicketStatus(ticket.id, newStatus);

    await (interaction.channel as TextChannel).send({
      embeds: [
        new EmbedBuilder()
          .setDescription(`📋 티켓 상태가 **${newStatus}**(으)로 변경되었습니다.`)
          .setColor(0x5865F2)
          .setTimestamp(),
      ],
    });

    await interaction.reply({ content: `✅ 상태가 **${newStatus}**(으)로 변경되었습니다.`, flags: MessageFlags.Ephemeral });
    setTimeout(() => interaction.deleteReply().catch(() => {}), 5000);
  }

  // ─── 작업자 초대 ─────────────────────────────────────────────────

  @Button('ticket_invite_worker')
  async onInviteWorker(@Context() [interaction]: ButtonContext) {
    if (!await this.hasAccess(interaction)) {
      await interaction.reply({ content: '권한이 없습니다.', flags: MessageFlags.Ephemeral });
      setTimeout(() => interaction.deleteReply().catch(() => {}), 5000);
      return;
    }

    const userSelect = new UserSelectMenuBuilder()
      .setCustomId('select_invite_worker')
      .setPlaceholder('초대할 작업자를 선택해주세요')
      .setMinValues(1)
      .setMaxValues(1);

    await interaction.reply({
      content: '초대할 작업자를 선택해주세요.',
      components: [new ActionRowBuilder<UserSelectMenuBuilder>().addComponents(userSelect)],
      flags: MessageFlags.Ephemeral,
    });
  }

  @UserSelect('select_invite_worker')
  async onSelectInviteWorker(@Context() [interaction]: UserSelectContext) {
    if (!interaction.guild || !interaction.channel) return;

    if (!await this.hasAccess(interaction)) {
      await interaction.reply({ content: '권한이 없습니다.', flags: MessageFlags.Ephemeral });
      return;
    }

    const user = interaction.users.first();
    if (!user) return;

    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    if (!member) {
      await interaction.reply({ content: '해당 유저를 찾을 수 없습니다.', flags: MessageFlags.Ephemeral });
      return;
    }

    const ticket = await this.ticketService.getTicketByChannelId(interaction.channelId ?? '');
    if (!ticket) {
      await interaction.reply({ content: '티켓 정보를 찾을 수 없습니다.', flags: MessageFlags.Ephemeral });
      return;
    }

    const channel = interaction.channel as TextChannel;

    await channel.permissionOverwrites.edit(member.id, {
      ViewChannel: true,
      SendMessages: true,
      ReadMessageHistory: true,
      AttachFiles: true,
    });

    await this.ticketService.addInvitedWorker(ticket.id, member.id);

    await channel.send({
      embeds: [
        new EmbedBuilder()
          .setDescription(`👋 <@${member.id}>님이 티켓에 초대되었습니다.`)
          .setColor(0x57F287)
          .setTimestamp(),
      ],
    });

    await interaction.update({ content: `✅ <@${member.id}>님이 초대되었습니다.`, components: [] });
    setTimeout(() => interaction.deleteReply().catch(() => {}), 5000);
  }

  // ─── 티켓 종료 ──────────────────────────────────────────────────

  @Button('ticket_close')
  async onTicketClose(@Context() [interaction]: ButtonContext) {
    if (!await this.hasAccess(interaction)) {
      await interaction.reply({ content: '권한이 없습니다.', flags: MessageFlags.Ephemeral });
      setTimeout(() => interaction.deleteReply().catch(() => {}), 5000);
      return;
    }

    const confirmRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('ticket_close_confirm')
        .setLabel('종료 확인')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId('ticket_close_cancel')
        .setLabel('취소')
        .setStyle(ButtonStyle.Secondary),
    );

    await interaction.reply({
      content: '정말로 티켓을 종료하시겠습니까?',
      components: [confirmRow],
      flags: MessageFlags.Ephemeral,
    });
  }

  @Button('ticket_close_cancel')
  async onTicketCloseCancel(@Context() [interaction]: ButtonContext) {
    await interaction.update({ content: '취소되었습니다.', components: [] });
    setTimeout(() => interaction.deleteReply().catch(() => {}), 3000);
  }

  @Button('ticket_close_confirm')
  async onTicketCloseConfirm(@Context() [interaction]: ButtonContext) {
    if (!interaction.guild || !interaction.channel) return;

    await interaction.update({ content: '🔒 티켓을 종료하는 중...', components: [] });

    const ticket = await this.ticketService.getTicketByChannelId(interaction.channelId);
    if (!ticket) {
      await interaction.editReply({ content: '티켓 정보를 찾을 수 없습니다.' });
      return;
    }

    const config = await this.ticketService.getOrCreateGuildConfig(interaction.guild.id);

    // 로그 채널에 요약 임베드 저장
    if (config.logChannelId) {
      const logChannel = interaction.guild.channels.cache.get(config.logChannelId);
      if (logChannel?.isTextBased()) {
        const invitedIds: string[] = ticket.invitedWorkerIds
          ? JSON.parse(ticket.invitedWorkerIds)
          : [];

        const logEmbed = new EmbedBuilder()
          .setTitle(`🔒 티켓 종료 — #${String(ticket.ticketNumber).padStart(4, '0')}`)
          .addFields(
            { name: '의뢰자', value: `<@${ticket.requesterId}> (${ticket.requesterTag})`, inline: true },
            { name: '문의 유형', value: ticket.inquiryType, inline: true },
            { name: '최종 상태', value: ticket.status, inline: true },
            { name: '생성일', value: ticket.createdAt.toLocaleString('ko-KR'), inline: true },
            { name: '종료일', value: new Date().toLocaleString('ko-KR'), inline: true },
            {
              name: '초대된 작업자',
              value: invitedIds.length > 0 ? invitedIds.map((id) => `<@${id}>`).join(', ') : '없음',
            },
          )
          .setColor(0xED4245)
          .setTimestamp();

        await logChannel.send({ embeds: [logEmbed] });
      }
    }

    await this.ticketService.closeTicket(ticket.id);

    const channel = interaction.channel as TextChannel;

    // 의뢰자 채널 접근 권한 제거
    await channel.permissionOverwrites.delete(ticket.requesterId).catch(() => {});

    // 채널 이름 변경 및 아카이브로 이동
    await channel.setName(`closed-${channel.name}`).catch(() => {});

    if (config.archiveCategoryId) {
      await channel.setParent(config.archiveCategoryId, { lockPermissions: false }).catch(() => {});
    }

    await channel.send({
      embeds: [
        new EmbedBuilder()
          .setDescription('🔒 티켓이 종료되었습니다.')
          .setColor(0xED4245)
          .setTimestamp(),
      ],
    });

    await interaction.deleteReply().catch(() => {});
  }
}
