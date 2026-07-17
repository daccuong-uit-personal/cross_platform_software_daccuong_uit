import { Module } from '@nestjs/common';
import { SocialProxyController } from './social-proxy.controller';
import { ProfileProxyController } from './profile-proxy.controller';
import { HttpProxyService } from '../common/services/http-proxy.service';

@Module({
  controllers: [SocialProxyController, ProfileProxyController],
  providers: [HttpProxyService],
})
export class SocialProxyModule {}
