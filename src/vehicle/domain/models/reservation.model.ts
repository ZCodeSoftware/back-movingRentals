export class ReservationModel {
    private readonly _start: string;
    private readonly _end: string;

    constructor(start: string, end: string) {
        this._start = start;
        this._end = end;
    }

    public toJSON() {
        return {
            start: this._start,
            end: this._end,
        };
    }

    static create(reservation: any): ReservationModel {
        return new ReservationModel(reservation.start, reservation.end);
    }

    static hydrate(reservation: any): ReservationModel {
        return new ReservationModel(reservation.start, reservation.end);
    }
}
