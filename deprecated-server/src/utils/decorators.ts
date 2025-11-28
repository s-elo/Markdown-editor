/* eslint-disable @typescript-eslint/naming-convention */
import { HttpException, HttpStatus } from '@nestjs/common';
import { Logger } from 'winston';

/**
 * Used to catch any exceptions for the method using HTTPException
 * @param message Custom error message with the thrown error message
 */
export function ExceptionCatcher(message?: string) {
  return function (_: unknown, methodName: string, descriptor: PropertyDescriptor) {
    if (typeof descriptor.value !== 'function') {
      throw new Error('ExceptionCatcher can only be used on methods');
    }

    const originalMethod = descriptor.value as (...args: unknown[]) => unknown;

    descriptor.value = function (this: { logger?: Logger }, ...args: unknown[]) {
      try {
        return originalMethod.apply(this, args);
      } catch (error) {
        const errorMessage = `${message ?? `Exception in ${methodName}`}: ${(error as Error).message}`;
        this.logger?.error(errorMessage);
        throw new HttpException({ message: errorMessage }, HttpStatus.INTERNAL_SERVER_ERROR);
      }
    };
  };
}
