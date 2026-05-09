import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GuildConfig } from '../entities/guild-config.entity';
import { Ticket } from '../entities/ticket.entity';
import { TicketService } from './ticket.service';
import { SetupCommand } from './commands/setup.command';
import { TicketButtonHandler } from './handlers/ticket-button.handler';
import { TicketModalHandler } from './handlers/ticket-modal.handler';
import { TicketActionHandler } from './handlers/ticket-action.handler';

@Module({
  imports: [TypeOrmModule.forFeature([Ticket, GuildConfig])],
  providers: [
    TicketService,
    SetupCommand,
    TicketButtonHandler,
    TicketModalHandler,
    TicketActionHandler,
  ],
  exports: [TicketService],
})
export class TicketModule {}
