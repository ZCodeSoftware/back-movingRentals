import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseErrorException } from '../../../../core/domain/exceptions/base.error.exception';
import { VEHICLE_RELATIONS } from '../../../../core/infrastructure/nest/constants/relations.constant';
import { VehicleModel } from '../../../domain/models/vehicle.model';
import { IVehicleRepository } from '../../../domain/repositories/vehicle.interface.repository';
import { UpdatePriceByModelDTO } from '../../nest/dtos/vehicle.dto';
import { VehicleSchema } from '../schemas/vehicle.schema';

@Injectable()
export class VehicleRepository implements IVehicleRepository {
  constructor(
    @InjectModel('Vehicle') private readonly vehicleDB: Model<VehicleSchema>,
  ) {}

  async create(vehicle: VehicleModel): Promise<VehicleModel> {
    const schema = new this.vehicleDB(vehicle.toJSON());
    const newVehicle = await schema.save();

    if (!newVehicle)
      throw new BaseErrorException(
        `Vehicle shouldn't be created`,
        HttpStatus.BAD_REQUEST,
      );

    return VehicleModel.hydrate(newVehicle);
  }

  async findById(id: string): Promise<VehicleModel> {
    const vehicle = await this.vehicleDB
      .findById(id)
      .populate('category')
      .populate('owner')
      .populate('model');
    if (!vehicle)
      throw new BaseErrorException('Vehicle not found', HttpStatus.NOT_FOUND);
    return VehicleModel.hydrate(vehicle);
  }

  async findByDate(query: any): Promise<VehicleModel[]> {
    const start = query.start ? new Date(query.start) : null;
    const end = query.end ? new Date(query.end) : null;

    const filter: any = {};

    if (start && end) {
      const bufferMs = 0;

      const startWithBuffer = new Date(start.getTime() - bufferMs);
      const endWithBuffer = new Date(end.getTime() + bufferMs);

      filter.$or = [
        { reservations: { $exists: false } },
        { reservations: { $size: 0 } },
        {
          reservations: {
            $not: {
              $elemMatch: {
                $or: [
                  {
                    start: { $lte: startWithBuffer },
                    end: { $gte: endWithBuffer },
                  },
                  { start: { $gte: startWithBuffer, $lt: endWithBuffer } },
                  { end: { $gt: startWithBuffer, $lte: endWithBuffer } },
                ],
              },
            },
          },
        },
      ];
    }

    filter.isActive = true;

    const vehicles = await this.vehicleDB
      .find(filter)
      .sort({ tag: 1 })
      .populate('category')
      .populate('owner')
      .populate('model');

    return vehicles?.map((vehicle) => VehicleModel.hydrate(vehicle));
  }

  async findAll(filters: any): Promise<VehicleModel[]> {
    const query = {};

    if (filters.name) {
      query['name'] = { $regex: `.*${filters.name}.*`, $options: 'i' };
    }

    const vehicles = await this.vehicleDB
      .find(query)
      .sort({ name: 1 })
      .populate('category')
      .populate('owner')
      .populate('model');
    return vehicles?.map((vehicle) => VehicleModel.hydrate(vehicle));
  }

  async update(id: string, vehicle: VehicleModel): Promise<VehicleModel> {
    const updateObject = vehicle.toJSON();

    const filteredUpdateObject = Object.fromEntries(
      Object.entries(updateObject).filter(([key, value]) => {
        if (VEHICLE_RELATIONS.includes(key)) {
          return (
            value !== null &&
            value !== undefined &&
            typeof value === 'object' &&
            '_id' in value
          );
        }
        return value !== null && value !== undefined;
      }),
    );

    const updatedVehicle = await this.vehicleDB
      .findByIdAndUpdate(id, filteredUpdateObject, {
        new: true,
        omitUndefined: true,
      })
      .populate('category')
      .populate('owner')
      .populate('model');

    if (!updatedVehicle)
      throw new BaseErrorException('Vehicle not found', HttpStatus.NOT_FOUND);

    return VehicleModel.hydrate(updatedVehicle);
  }

  async updatePriceByModel(
    model: string,
    prices: UpdatePriceByModelDTO,
  ): Promise<void> {
    await this.vehicleDB.updateMany({ model }, { $set: prices });
  }

  async updateReservation(
    vehicleId: string,
    originalEndDate: Date,
    newEndDate: Date,
  ): Promise<void> {
    // First, try to find the vehicle and the specific reservation
    const vehicle = await this.vehicleDB.findById(vehicleId);
    if (!vehicle || !vehicle.reservations) return;

    // Find the reservation that matches the original end date (with some tolerance for date differences)
    const reservationIndex = vehicle.reservations.findIndex((reservation) => {
      const reservationEndTime = new Date(reservation.end).getTime();
      const originalEndTime = originalEndDate.getTime();
      // Allow 1 minute tolerance for date differences
      const timeDifference = Math.abs(reservationEndTime - originalEndTime);
      return timeDifference <= 60000; // 60 seconds tolerance
    });

    if (reservationIndex === -1) {
      console.warn(
        `No reservation found for vehicle ${vehicleId} with end date ${originalEndDate}`,
      );
      return;
    }

    // Update the specific reservation using array index
    await this.vehicleDB.updateOne(
      { _id: vehicleId },
      {
        $set: { [`reservations.${reservationIndex}.end`]: newEndDate },
      },
    );
  }

  async softDelete(id: string): Promise<void> {
    const updated = await this.vehicleDB.findByIdAndUpdate(
      id,
      { isDeleted: true },
      { new: true },
    );
    if (!updated)
      throw new BaseErrorException('Vehicle not found', HttpStatus.NOT_FOUND);
  }
}
