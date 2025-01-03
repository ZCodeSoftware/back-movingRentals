import { Body, Controller, Inject, Post } from '@nestjs/common';
import { ApiBody, ApiTags } from '@nestjs/swagger';
import { BaseErrorException } from '../../../../core/domain/exceptions/base.error.exception';
import SymbolsNotification from '../../../../notification/symbols-notification';
import { INotificationService } from '../../../domain/services/notification.interface.service';
import { ContactUserDto } from '../dto/notifications.dto';

@ApiTags('Notification')
@Controller('notification')
export class NotificationController {
  constructor(
    @Inject(SymbolsNotification.INotificationService)
    private readonly notificationService: INotificationService,
  ) {}

  @Post('contact-user')
  @ApiBody({ type: ContactUserDto })
  async contactUser(@Body() body: ContactUserDto) {
    try {
      await this.notificationService.sendContactUserEmail(body);
      return {
        success: true,
        message: 'The email was sent successfully to the administrator.',
      };
    } catch (error) {
      throw new BaseErrorException(error.message, error.statusCode);
    }
  }
}
