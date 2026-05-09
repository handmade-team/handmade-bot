import { Injectable } from '@nestjs/common';
import { Button, Context, StringSelect } from 'necord';
import type { ButtonContext, StringSelectContext } from 'necord';
import {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  MessageFlags,
} from 'discord.js';
import { TicketService } from '../ticket.service';
import { InquiryType } from '../../entities/ticket.entity';

const INQUIRY_OPTIONS = [
  { label: '🛠 시스템 제작', description: '플러그인, 모드, 스크립트, API, 기능 구현', value: InquiryType.SYSTEM },
  { label: '🖥 서버 세팅', description: '서버 구축, 세팅, 최적화, 모드팩 구성', value: InquiryType.SERVER },
  { label: '🚀 커스텀 런처 제작', description: '마인크래프트 커스텀 런처 개발', value: InquiryType.LAUNCHER },
  { label: '👕 스킨 제작', description: '마인크래프트 스킨 제작 및 수정', value: InquiryType.SKIN },
  { label: '🏰 건축 (맵 제작)', description: '맵, 로비, 던전, 마을, 구조물 제작', value: InquiryType.BUILD },
  { label: '📋 기획', description: '콘텐츠 구조, 시스템 설계, 진행 방식 기획', value: InquiryType.PLAN },
  { label: '📖 스토리', description: '세계관, 퀘스트, 대사, NPC 설정', value: InquiryType.STORY },
  { label: '🎵 BGM', description: '배경음악, 테마곡, 효과음', value: InquiryType.BGM },
  { label: '🎨 디자인', description: '로고, 배너, UI, 썸네일, 홍보물', value: InquiryType.DESIGN },
  { label: '🖌 일러스트', description: '캐릭터 일러스트, 키비주얼, 굿즈용 이미지', value: InquiryType.ILLUST },
  { label: '📦 기타 문의', description: '제휴, 협업, 복합 의뢰, 기타 문의', value: InquiryType.OTHER },
];

@Injectable()
export class TicketButtonHandler {
  constructor(private readonly ticketService: TicketService) {}

  @Button('open_ticket')
  async onOpenTicket(@Context() [interaction]: ButtonContext) {
    if (!interaction.guild) return;

    const existing = await this.ticketService.getOpenTicketByRequester(
      interaction.guild.id,
      interaction.user.id,
    );

    if (existing) {
      await interaction.reply({
        content: `이미 진행 중인 문의가 있습니다. <#${existing.ticketChannelId}>`,
        flags: MessageFlags.Ephemeral,
      });
      setTimeout(() => interaction.deleteReply().catch(() => {}), 5000);
      return;
    }

    this.ticketService.setUserSelection(interaction.user.id, {});

    const select = new StringSelectMenuBuilder()
      .setCustomId('select_inquiry_type')
      .setPlaceholder('문의하실 작업 유형을 선택해주세요')
      .addOptions(INQUIRY_OPTIONS);

    await interaction.reply({
      content: '**🎫 가내수공업팀 문의하기**\n\n문의하실 작업 유형을 선택해주세요.',
      components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select)],
      flags: MessageFlags.Ephemeral,
    });
  }

  @StringSelect('select_inquiry_type')
  async onSelectInquiryType(@Context() [interaction]: StringSelectContext) {
    const inquiryType = interaction.values[0] as InquiryType;

    this.ticketService.updateUserSelection(interaction.user.id, { inquiryType });

    const modal = new ModalBuilder()
      .setCustomId('ticket_form_modal')
      .setTitle('문의 양식 작성')
      .addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId('contact')
            .setLabel('닉네임 / 연락 가능한 SNS')
            .setPlaceholder('예: 홍길동 / 디스코드 @example')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMaxLength(100),
        ),
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId('description')
            .setLabel('원하시는 작업 내용')
            .setPlaceholder('작업 내용을 최대한 자세히 설명해주세요.')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true)
            .setMaxLength(1000),
        ),
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId('budget')
            .setLabel('예산 (선택)')
            .setPlaceholder('예: 50,000원 / 협의 가능')
            .setStyle(TextInputStyle.Short)
            .setRequired(false)
            .setMaxLength(100),
        ),
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId('deadline')
            .setLabel('희망 완료일 (선택)')
            .setPlaceholder('예: 2026-06-01 / 협의 가능')
            .setStyle(TextInputStyle.Short)
            .setRequired(false)
            .setMaxLength(100),
        ),
      );

    await interaction.showModal(modal);
  }
}
