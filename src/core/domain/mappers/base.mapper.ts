export class BaseMapper {
    snakeToCamel(obj: any, omitParams: string[] = []): any {
        if (typeof obj !== 'object' || obj === null) {
            return obj;
        }

        if (Array.isArray(obj)) {
            return obj.map((item) => this.snakeToCamel(item, omitParams));
        }

        const camelObj = {};

        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());

                if (!omitParams.includes(camelKey)) {
                    camelObj[camelKey] = this.snakeToCamel(obj[key], omitParams);
                }
            }
        }

        return camelObj;
    }

    camelToSnake(obj: any, omitParams: string[] = []): any {
        if (typeof obj !== 'object' || obj === null) {
            return obj;
        }

        if (Array.isArray(obj)) {
            return obj.map((item) => this.camelToSnake(item, omitParams));
        }

        const snakeObj = {};

        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                if (!omitParams.includes(key)) {
                    const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
                    snakeObj[snakeKey] = this.camelToSnake(obj[key], omitParams);
                }
            }
        }

        return snakeObj;
    }

    public serialize(): object {
        const data: any = {};
        for (const x in this) {
            const atr: any = this[x];
            if (x == 'id' || x === 'updatedAt' || x === 'createdAt') {
                data[x] = atr?.toString();
            } else {
                data[x] = this[x];
            }
        }
        return data;
    }

    public rmDoubleUnderscore(props: object) {
        const result: any = {};
        for (const key in props) {
            if (props.hasOwnProperty(key)) {
                const newKey = key.replace(/_/g, '');
                result[newKey] = props[key];
            }
        }
        return result;
    }
}
