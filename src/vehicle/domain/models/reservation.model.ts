export class ReservationModel {
    private readonly _start: string;
    private readonly _end: string;
    private readonly _bookingId?: string;
    private readonly _reservationId?: string;

    constructor(start: string, end: string, bookingId?: string, reservationId?: string) {
        this._start = start;
        this._end = end;
        this._bookingId = bookingId;
        this._reservationId = reservationId;
    }

    public toJSON() {
        return {
            start: this._start,
            end: this._end,
            ...(this._bookingId && { bookingId: this._bookingId }),
            ...(this._reservationId && { reservationId: this._reservationId }),
        };
    }

    get bookingId(): string | undefined {
        return this._bookingId;
    }

    get reservationId(): string | undefined {
        return this._reservationId;
    }

    static create(reservation: any): ReservationModel {
        return new ReservationModel(
            reservation.start, 
            reservation.end, 
            reservation.bookingId, 
            reservation.reservationId
        );
    }

    static hydrate(reservation: any): ReservationModel {
        return new ReservationModel(
            reservation.start, 
            reservation.end, 
            reservation.bookingId, 
            reservation.reservationId
        );
    }
}
