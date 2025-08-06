import { MovementService } from '../../../application/services/movement.service';
import SymbolsMovement from '../../../symbols-movement';
import { MovementRepository } from '../../mongo/repositories/movement.repository';

export const movementService = {
  provide: SymbolsMovement.IMovementService,
  useClass: MovementService,
};

export const movementRepository = {
  provide: SymbolsMovement.IMovementRepository,
  useClass: MovementRepository,
};
