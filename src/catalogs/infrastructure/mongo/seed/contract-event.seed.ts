import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ICatContractEventService } from '../../../domain/services/cat-contract-event.interface.service';
import SymbolsCatalogs from '../../../symbols-catalogs';

@Injectable()
export class ContractEventSeed implements OnModuleInit {
  private readonly logger = new Logger(ContractEventSeed.name);
  constructor(
    @Inject(SymbolsCatalogs.ICatContractEventService)
    private readonly service: ICatContractEventService,
  ) { }

  async onModuleInit() {
    const names = [
      'TRANSFER PDC',
      'RESTANTE TRANSFER AEROPUERTO',
      'DELIVERY',
      'EXTENSION DE RENTA',
      'LLANTA PAGADA POR CLIENTE',
      'CASCO PAGADO POR CLIENTE',
      'RESERVA',
      'WIFI',
      'TRANSFER TULUM-XCARET',
      'ROBO',
      'SOPORTE PARA CELULAR',
      'RESCATE VEHICULO',
      'HORAS EXTRAS',
      'RECOLECCION',
      'TICKET CASA TORTUGA X3',
      'CASA TORTUGA X6',
      'CASA TORTUGA X2',
      'CASA TORTUGA BASICO',
      'CANDADO DE BICICLETA PAGADO POR CLIENTE',
      'BICICLETA PAGADA POR EL CLIENTE',
      'VEHICULO PAGADO POR CLIENTE',
      'CANDADO 20MM',
      'ASIENTO BICICLETA PAGADO POR CLIENTE',
      'ESPEJOS PAGADO POR CLIENTE',
      'CANASTA PAGADA POR CLIENTE',
      'PROPINA',
      'CANCELACION',
      'REPARACION PAGADA POR CLIENTE',
      'COMBUSTIBLE PAGADO POR CLIENTE',
      'COPIA DE LLAVE - CLIENTE',
      'DELIVERY GAS',
      'DROPOFF/PICKUP',
      'LOCK - CLIENTE',
      'CRASH',
      'TOURS',
      'RIDE',
      'LATE PICK UP',
      'RENTA',
      'TRANSFER TULUM-AEROPUERTO',
      'REPORTE',
      'IMPRESIONES A COLOR',
      'GASTO PARA TOURS',
      "CAMBIO DE VEHICULO"
    ];

    for (const name of names) {
      try {
        await this.service.create({ name });
      } catch (err: any) {
        // ignore duplicates
        if (!/already exists/i.test(err?.message ?? '')) {
          this.logger.warn(`Seed failed for ${name}: ${err.message}`);
        }
      }
    }

    this.logger.log('ContractEvent seed completed');
  }
}
