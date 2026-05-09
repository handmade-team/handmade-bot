import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GuildConfig } from '../entities/guild-config.entity';
import { Ticket } from '../entities/ticket.entity';
import { TicketService } from './ticket.service';
import { SetupCommand } from './commands/setup.command';

@Module({
  imports: [TypeOrmModule.forFeature([Ticket, GuildConfig])],
  providers: [TicketService, SetupCommand],
  exports: [TicketService],
})
export class TicketModule {}
