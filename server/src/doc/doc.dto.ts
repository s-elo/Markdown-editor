import { PipeTransform } from '@nestjs/common';

/**
 * @param key the key of the value to be encoded, if not provided, the value must be a string
 * @returns a pipe that encodes the value of the key if it contains '/'
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export function CreateEncodeFilePathPipe(key?: string[] | string) {
  return class EncodeFilePathPipe implements PipeTransform {
    public transform(value: Record<string, unknown> | string) {
      if (typeof value === 'string') {
        if (value.includes('/')) {
          return encodeURIComponent(value);
        }
        return value;
      }

      if (!key) {
        throw new Error('value is not a string and key is required.');
      }

      if (Array.isArray(key)) {
        return {
          ...value,
          ...key.reduce((acc, k) => {
            if (value[k] && typeof value[k] === 'string' && value[k].includes('/')) {
              acc[k] = encodeURIComponent(value[k]);
            }
            return acc;
          }, {}),
        };
      }

      if (key && value[key] && typeof value[key] === 'string' && value[key].includes('/')) {
        return {
          ...value,
          [key]: encodeURIComponent(value[key]),
        };
      }
      return value;
    }
  };
}
