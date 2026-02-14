import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class ImagekitService {
  private readonly privateKey: string;
  private readonly publicKey: string;
  private readonly urlEndpoint: string;

  constructor() {
    // TODO: Mover estas variables a .env
    this.privateKey = process.env.IMAGEKIT_PRIVATE_KEY || '';
    this.publicKey = process.env.IMAGEKIT_PUBLIC_KEY || '';
    this.urlEndpoint = process.env.IMAGEKIT_URL_ENDPOINT || 'https://ik.imagekit.io/moovadventures';
  }

  /**
   * Genera los parámetros de autenticación necesarios para subir archivos a ImageKit
   * @returns Objeto con token, expire y signature
   */
  getAuthenticationParameters() {
    const token = crypto.randomBytes(16).toString('hex');
    const expire = Math.floor(Date.now() / 1000) + 3600; // Token válido por 1 hora
    
    const signature = crypto
      .createHmac('sha1', this.privateKey)
      .update(token + expire)
      .digest('hex');

    return {
      token,
      expire,
      signature,
      publicKey: this.publicKey,
      urlEndpoint: this.urlEndpoint,
    };
  }
}
