import { Controller, Inject } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { OnEvent } from '@nestjs/event-emitter';
import SymbolsNotification from '../../../../notification/symbols-notification';
import { INotificationService } from '../../../../notification/domain/services/notificacion.interface';

@ApiTags('Notification Event')
@Controller('notification-event')
export class NotificationController {
  constructor(
    @Inject(SymbolsNotification.INotificationService)
    private readonly notificationService: INotificationService,
  ) {}

  @OnEvent('user-email-notification')
  async reservationEmail({ email, name }: { email: string; name: string }) {
    await this.notificationService.reservationEmail(email, name);
  }
}
