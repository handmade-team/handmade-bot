import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NecordModule } from 'necord';
import { IntentsBitField } from 'discord.js';
import { TicketModule } from './ticket/ticket.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cs: ConfigService) => ({
        type: 'better-sqlite3',
        database: cs.get('DATABASE_PATH') || './bot.db',
        autoLoadEntities: true,
        synchronize: true,
      }),
    }),
    NecordModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cs: ConfigService) => ({
        token: cs.getOrThrow('DISCORD_TOKEN'),
        intents: [
          IntentsBitField.Flags.Guilds,
          IntentsBitField.Flags.GuildMessages,
          IntentsBitField.Flags.GuildMembers,
          IntentsBitField.Flags.MessageContent,
        ],
        development: [cs.get('GUILD_ID')].filter(Boolean) as string[],
      }),
    }),
    TicketModule,
  ],
})
export class AppModule {}
