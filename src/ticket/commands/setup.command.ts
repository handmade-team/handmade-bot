import { Injectable } from '@nestjs/common';
import { Context, Options, SlashCommand } from 'necord';
import type { SlashCommandContext } from 'necord';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  EmbedBuilder,
  MessageFlags,
  PermissionFlagsBits,
  TextChannel,
} from 'discord.js';
import { SetupOptionsDto } from './setup-options.dto';
import { TicketService } from '../ticket.service';

@Injectable()
export class SetupCommand {
  constructor(private readonly ticketService: TicketService) {}

  @SlashCommand({
    name: 'setup',
    description: '티켓 시스템을 설정합니다',
    defaultMemberPermissions: PermissionFlagsBits.Administrator,
  })
  async onSetup(
    @Context() [interaction]: SlashCommandContext,
    @Options() options: SetupOptionsDto,
  ) {
    if (!interaction.guild) {
      return interaction.reply({
        content: '이 명령어는 서버에서만 사용할 수 있습니다.',
        flags: MessageFlags.Ephemeral,
      });
    }

    const {
      team_leader_role,
      cs_role,
      ticket_category,
      archive_category,
      ticket_channel,
      log_channel,
    } = options;

    if (ticket_category.type !== ChannelType.GuildCategory) {
      return interaction.reply({
        content: '티켓 카테고리는 카테고리 채널이어야 합니다.',
        flags: MessageFlags.Ephemeral,
      });
    }

    if (archive_category.type !== ChannelType.GuildCategory) {
      return interaction.reply({
        content: '아카이브 카테고리는 카테고리 채널이어야 합니다.',
        flags: MessageFlags.Ephemeral,
      });
    }

    await this.ticketService.updateGuildConfig(interaction.guild.id, {
      teamLeaderRoleId: team_leader_role.id,
      csRoleId: cs_role.id,
      ticketCategoryId: ticket_category.id,
      archiveCategoryId: archive_category.id,
      ticketChannelId: ticket_channel.id,
      logChannelId: log_channel.id,
    });

    const embed = new EmbedBuilder()
      .setTitle('🎫 가내수공업팀 제작 문의')
      .setDescription(
        '마인크래프트 관련 제작을 의뢰하시려면 아래 버튼을 클릭하세요.\n\n' +
        '서버 세팅, 시스템 제작, 커스텀 런처, 스킨, 건축, BGM, 디자인 등\n' +
        '다양한 분야의 제작을 도와드립니다.',
      )
      .setColor(0x5865F2)
      .setFooter({ text: '문의 내용은 팀장 및 CS 담당자만 확인할 수 있습니다.' });

    const button = new ButtonBuilder()
      .setCustomId('open_ticket')
      .setLabel('📩 문의하기')
      .setStyle(ButtonStyle.Primary);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(button);

    const message = await (ticket_channel as TextChannel).send({
      embeds: [embed],
      components: [row],
    });

    await this.ticketService.updateGuildConfig(interaction.guild.id, {
      ticketMessageId: message.id,
    });

    return interaction.reply({
      content: '✅ 티켓 시스템이 설정되었습니다!',
      flags: MessageFlags.Ephemeral,
    });
  }
}
