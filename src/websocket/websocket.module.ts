import { Module } from '@nestjs/common';
import { WebsocketService } from './websocket.service';
import { WebsocketGateway } from './websocket.gateway';

@Module({
  providers: [WebsocketGateway, WebsocketService],
  exports: [WebsocketGateway],
})
export class WebsocketModule {}
