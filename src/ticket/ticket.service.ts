import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { GuildConfig } from '../entities/guild-config.entity';
import { InquiryType, Ticket, TicketStatus } from '../entities/ticket.entity';

export interface UserSelection {
  inquiryType?: InquiryType;
}

@Injectable()
export class TicketService {
  private userSelections = new Map<string, UserSelection>();

  constructor(
    @InjectRepository(GuildConfig)
    private readonly guildConfigRepo: Repository<GuildConfig>,
    @InjectRepository(Ticket)
    private readonly ticketRepo: Repository<Ticket>,
  ) {}

  // ─── 인메모리 선택 상태 ───────────────────────────────────────────

  setUserSelection(userId: string, data: UserSelection): void {
    this.userSelections.set(userId, data);
  }

  getUserSelection(userId: string): UserSelection | undefined {
    return this.userSelections.get(userId);
  }

  updateUserSelection(userId: string, partial: Partial<UserSelection>): void {
    const existing = this.userSelections.get(userId) ?? {};
    this.userSelections.set(userId, { ...existing, ...partial });
  }

  clearUserSelection(userId: string): void {
    this.userSelections.delete(userId);
  }

  // ─── GuildConfig ────────────────────────────────────────────────

  async getOrCreateGuildConfig(guildId: string): Promise<GuildConfig> {
    let config = await this.guildConfigRepo.findOne({ where: { guildId } });
    if (!config) {
      config = this.guildConfigRepo.create({ guildId });
      await this.guildConfigRepo.save(config);
    }
    return config;
  }

  async updateGuildConfig(
    guildId: string,
    partial: Partial<GuildConfig>,
  ): Promise<GuildConfig> {
    await this.guildConfigRepo.upsert({ guildId, ...partial }, ['guildId']);
    return this.getOrCreateGuildConfig(guildId);
  }

  async getNextTicketNumber(guildId: string): Promise<number> {
    const config = await this.getOrCreateGuildConfig(guildId);
    const next = config.ticketCounter + 1;
    await this.guildConfigRepo.update({ guildId }, { ticketCounter: next });
    return next;
  }

  // ─── Ticket ─────────────────────────────────────────────────────

  async createTicket(data: {
    guildId: string;
    ticketNumber: number;
    requesterId: string;
    requesterTag: string;
    ticketChannelId: string;
    inquiryType: InquiryType;
    formData?: string;
  }): Promise<Ticket> {
    const ticket = this.ticketRepo.create(data);
    return this.ticketRepo.save(ticket);
  }

  async getTicketByChannelId(channelId: string): Promise<Ticket | null> {
    return this.ticketRepo.findOne({ where: { ticketChannelId: channelId } });
  }

  async getOpenTicketByRequester(
    guildId: string,
    requesterId: string,
  ): Promise<Ticket | null> {
    return this.ticketRepo.findOne({
      where: { guildId, requesterId, closedAt: IsNull() },
    });
  }

  async updateTicketStatus(
    id: number,
    status: TicketStatus,
  ): Promise<Ticket | null> {
    await this.ticketRepo.update({ id }, { status });
    return this.ticketRepo.findOne({ where: { id } });
  }

  async closeTicket(id: number): Promise<void> {
    await this.ticketRepo.update({ id }, { closedAt: new Date() });
  }

  async addInvitedWorker(id: number, workerId: string): Promise<Ticket | null> {
    const ticket = await this.ticketRepo.findOne({ where: { id } });
    if (!ticket) return null;
    const ids: string[] = ticket.invitedWorkerIds
      ? JSON.parse(ticket.invitedWorkerIds)
      : [];
    if (!ids.includes(workerId)) ids.push(workerId);
    await this.ticketRepo.update({ id }, { invitedWorkerIds: JSON.stringify(ids) });
    return this.ticketRepo.findOne({ where: { id } });
  }
}
