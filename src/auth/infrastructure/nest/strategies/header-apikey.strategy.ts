import { Inject, Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import Strategy from 'passport-headerapikey';
import { IApiKeyService } from '../../../domain/services/api-key.interface.service';
import SymbolsAuth from '../../../symbols-auth';

@Injectable()
export class HeaderApiKeyStrategy extends PassportStrategy(
  Strategy,
  'api-key',
) {
  constructor(
    @Inject(SymbolsAuth.IApiKeyService)
    private readonly apiKeyService: IApiKeyService,
  ) {
    super({ header: 'X-API-KEY', prefix: '' }, true, async (apiKey, done) => {
      return this.apiKeyService.validateApiKey(apiKey, done);
    });
  }
}
