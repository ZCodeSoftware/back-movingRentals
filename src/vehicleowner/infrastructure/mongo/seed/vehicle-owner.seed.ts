import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { IVehicleOwnerRepository } from '../../../domain/repositories/vehicleowner.interface.repository';
import SymbolsVehicleOwner from '../../../symbols-vehicleowner';
import { VehicleOwnerModel } from '../../../domain/models/vehicleowner.model';

@Injectable()
export class VehicleOwnerSeed implements OnModuleInit {
  private readonly logger = new Logger(VehicleOwnerSeed.name);
  
  constructor(
    @Inject(SymbolsVehicleOwner.IVehicleOwnerRepository)
    private readonly repository: IVehicleOwnerRepository,
  ) { }

  async onModuleInit() {
    const names = [
      'ALAIN',
      'S/D',
      'ANA',
      'MARIO',
      'VILCHIS',
      'CHARLY',
      'DAVID',
      'KENYA',
      'IRIE',
      'KIRIAKOS',
      'LOCAL',
      'AGUSTINA',
      'AGUSTIN',
      'ALEX',
      'MARIANA',
      'RODRIGO',
      'CLEMENCE',
      'DANIEL',
      'CONCIERGE XCAPE',
      'RICARDO',
      'CARMEN',
      'CONCIERGE ALAYA',
      'ROXANA',
      'NICOLE',
      'NICOLAS',
      'ROSSY',
      'GABRIEL',
      'SERGIO YEH',
      'LALO',
      'ESDREY',
      'GALINDEZ AGUSTIN',
      'PAULINA',
      'JOSE SIGALA',
      'HERZAIN',
      'OSCAR',
      'CAMILA',
      'ANUAR',
      'ALEJANDRA ARENAS',
      'MARCOS PEBETA',
      'NAYA',
      'ANWAR',
      'MAKA',
      'ALEX CARON',
      'SERGIO',
      'BLAISE',
      'YAYA',
      'PAZ CELESTI',
      'KEVIN MERIDA',
      'VICTOR GARCIA',
      'CONCIERGE LA DIOSA',
      'MANUEL',
      'THE MAZZINIS',
      'MARCO ELIAS',
      'MARCO COBANITAS',
      'BUFO ALVARIUS',
      'AGUSTIN SALTA',
      'MARCO/MANUEL',
      'MARCO/NICOLAS',
      'CONCIERGE MUN',
      'LUCAS',
      'TIENDA',
      'LUZ DE LUNA',
      'SEBASTIAN HOSLY',
      'SEGURIDAD PANORAMIC',
      'ABAD SEGURIDAD PANORAMIC',
      'RECEPCION ANA Y JOSE',
      'MEL CASTEL',
      'DANIEL ORIGIN',
      'BENY SEGURIDAD PANORAMIC',
      'ALEJANDRO COBIAN SEGURIDAD PANORAMIC',
      'MARTINA',
      'THE BEACH PLANNER',
      'ALEJO',
      'BEL COLLELA',
      'MIRIAM WAVES',
      'LAYLA',
      'NICOLAS TUCUMAN',
      'SELENE',
      'BARBARA PADILLA',
      'TUK-FRONT DESK',
      'MARCE GUERRA',
      'XUXU',
      'MARCO ALAIN',
      'FRANCISCO BARRAN SOTO',
      'VENU',
      'NICOL',
      'PIA NAHOUSE',
      'OMAR',
      'MELISSA',
      'FLAVIA',
      'VALENTINA',
      'SAHA',
      'CONCIERGE MEREVA/NEREA/ALEA',
      'ABI & CHRIS',
      'nacho',
      'CONCIERGE MOOTS',
      'CONCIERGE MAJARO',
      'CONCIERGE SANTAL',
      'LAGOON',
      'ANDRES HOTEL MAREA',
      'CONCIERGE HOTEL K\'UYEN',
      'ELY BURGOS',
      'PERLA',
      'DREAMY',
      'SANDRA PEREZ',
      'VERO CONCIERGE MAJARO',
      'UNHO',
      'ZELVA',
      'GIGI',
      'CONCIERGE SATORI',
      'CONCIERGE MADDALENA',
      'CONCIERGE VALENTINA',
      'CONCIERGE ERICK',
      'CONCIERGE JUAN MANUEL ZELVA'
    ];

    for (const name of names) {
      try {
        // Check if already exists (case-insensitive)
        const existing = await this.repository.findByName(name);
        
        if (existing) {
          this.logger.debug(`VehicleOwner "${name}" already exists, skipping`);
          continue;
        }

        // Determine if it's a concierge based on name
        const isConcierge = name.toLowerCase().includes('concierge');
        
        // Create the vehicle owner
        const vehicleOwner = VehicleOwnerModel.create({
          name,
          phone: '', // Default empty phone
          commissionPercentage: 15, // All get 15% as specified
          isConcierge
        });

        await this.repository.create(vehicleOwner);
        this.logger.log(`Created VehicleOwner: ${name} (isConcierge: ${isConcierge})`);
      } catch (err: any) {
        this.logger.warn(`Seed failed for ${name}: ${err.message}`);
      }
    }

    this.logger.log('VehicleOwner seed completed');
  }
}
