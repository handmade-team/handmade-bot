import { Injectable } from '@nestjs/common';
import { Context, Modal } from 'necord';
import type { ModalContext } from 'necord';
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
import { TicketService } from '../ticket.service';
import { InquiryType } from '../../entities/ticket.entity';

const INQUIRY_LABEL: Record<InquiryType, string> = {
  [InquiryType.SYSTEM]: '시스템',
  [InquiryType.SERVER]: '서버',
  [InquiryType.LAUNCHER]: '런처',
  [InquiryType.SKIN]: '스킨',
  [InquiryType.BUILD]: '건축',
  [InquiryType.PLAN]: '기획',
  [InquiryType.STORY]: '스토리',
  [InquiryType.BGM]: 'bgm',
  [InquiryType.DESIGN]: '디자인',
  [InquiryType.ILLUST]: '일러스트',
  [InquiryType.OTHER]: '기타',
};

@Injectable()
export class TicketModalHandler {
  constructor(private readonly ticketService: TicketService) {}

  @Modal('ticket_form_modal')
  async onTicketFormModal(@Context() [interaction]: ModalContext) {
    if (!interaction.guild) return;

    const selection = this.ticketService.getUserSelection(interaction.user.id);
    const inquiryType = selection?.inquiryType;

    if (!inquiryType) {
      return interaction.reply({
        content: '문의 유형을 다시 선택해주세요.',
        flags: MessageFlags.Ephemeral,
      });
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const contact = interaction.fields.getTextInputValue('contact');
    const description = interaction.fields.getTextInputValue('description');
    const budget = interaction.fields.getTextInputValue('budget') || '미입력';
    const deadline = interaction.fields.getTextInputValue('deadline') || '미입력';

    const config = await this.ticketService.getOrCreateGuildConfig(interaction.guild.id);

    if (!config.teamLeaderRoleId || !config.csRoleId || !config.ticketCategoryId) {
      return interaction.editReply({
        content: '티켓 시스템이 설정되지 않았습니다. 관리자에게 문의해주세요.',
      });
    }

    const ticketNumber = await this.ticketService.getNextTicketNumber(interaction.guild.id);
    const label = INQUIRY_LABEL[inquiryType];
    const channelName = `${label}-${String(ticketNumber).padStart(4, '0')}`;

    const channel = await interaction.guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      parent: config.ticketCategoryId,
      permissionOverwrites: [
        { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
        {
          id: interaction.user.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
            PermissionFlagsBits.AttachFiles,
          ],
        },
        {
          id: config.teamLeaderRoleId,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
            PermissionFlagsBits.AttachFiles,
            PermissionFlagsBits.ManageMessages,
          ],
        },
        {
          id: config.csRoleId,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
            PermissionFlagsBits.AttachFiles,
            PermissionFlagsBits.ManageMessages,
          ],
        },
      ],
    });

    const formData = JSON.stringify({ contact, description, budget, deadline });

    await this.ticketService.createTicket({
      guildId: interaction.guild.id,
      ticketNumber,
      requesterId: interaction.user.id,
      requesterTag: interaction.user.tag,
      ticketChannelId: channel.id,
      inquiryType,
      formData,
    });

    this.ticketService.clearUserSelection(interaction.user.id);

    // 안내 임베드
    const welcomeEmbed = new EmbedBuilder()
      .setTitle('🎫 가내수공업팀 제작 문의가 접수되었습니다.')
      .setDescription(
        '안녕하세요! 가내수공업팀에 문의해주셔서 감사합니다.\n\n' +
        '📌 **문의 전 안내**\n' +
        '- 작업 가능 여부, 예상 견적, 일정은 작성해주신 내용을 바탕으로 검토됩니다.\n' +
        '- 예산과 마감일이 정해져 있을수록 상담이 빠르게 진행됩니다.\n' +
        '- 문의 내용에 따라 담당 파트 작업자가 티켓에 초대될 수 있습니다.\n' +
        '- 단순 문의는 무료 상담으로 진행되지만, 상세 기획/견적 산출이 필요한 경우 별도 협의가 필요할 수 있습니다.\n\n' +
        '가내수공업팀은 프리랜서 제작자들이 모여있는 제작팀입니다. 각 제작자마다 연락 가능한 시간대가 상이하며, ' +
        '작업자 배치가 끝난 후에 각각 응대 가능 시간을 안내드릴 예정입니다.\n\n' +
        '**1차 상담** : 작업자 배치 전\n' +
        '**2차 상담** : 작업자 배치 후 작업물에 관한 디테일한 상담 후 작업 개시',
      )
      .setColor(0x5865F2)
      .setFooter({ text: `티켓 #${String(ticketNumber).padStart(4, '0')} | ${label}` })
      .setTimestamp();

    // 의뢰자 입력 내용 임베드
    const formEmbed = new EmbedBuilder()
      .setTitle('📝 문의 내용')
      .addFields(
        { name: '문의 유형', value: label, inline: true },
        { name: '닉네임 / SNS', value: contact, inline: true },
        { name: '작업 내용', value: description },
        { name: '예산', value: budget, inline: true },
        { name: '희망 완료일', value: deadline, inline: true },
      )
      .setColor(0x57F287);

    // 관리자 액션 버튼
    const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('ticket_status')
        .setLabel('상태 변경')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('ticket_invite_worker')
        .setLabel('작업자 초대')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('ticket_close')
        .setLabel('티켓 종료')
        .setStyle(ButtonStyle.Danger),
    );

    await (channel as TextChannel).send({ embeds: [welcomeEmbed] });
    await (channel as TextChannel).send({ embeds: [formEmbed] });
    await (channel as TextChannel).send({
      content: `<@${interaction.user.id}> 님의 문의 채널입니다.`,
      components: [actionRow],
    });

    await interaction.editReply({
      content: `✅ 티켓이 생성되었습니다! <#${channel.id}>`,
    });

    setTimeout(() => interaction.deleteReply().catch(() => {}), 5000);
  }
}
