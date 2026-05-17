import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpStatus,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface SuccessResponse<T> {
  statusCode: number;
  data: T;
  meta: {
    timestamp: string;
    path: string;
    pagination?: any;
    [key: string]: any;
  };
  message?: string;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, SuccessResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<SuccessResponse<T>> {
    const ctx = context.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    return next.handle().pipe(
      map((resData) => {
        // If already fully wrapped (e.g., from proxy forward)
        if (
          resData &&
          typeof resData === 'object' &&
          'statusCode' in resData &&
          'data' in resData
        ) {
          return resData as SuccessResponse<T>;
        }

        // If it's a paginated or custom DTO containing data + meta
        if (
          resData &&
          typeof resData === 'object' &&
          'data' in resData &&
          'meta' in resData
        ) {
          return {
            statusCode: response?.statusCode ?? HttpStatus.OK,
            data: resData.data,
            meta: {
              ...resData.meta,
              timestamp: new Date().toISOString(),
              path: request?.url ?? '',
            },
            ...(resData.message ? { message: resData.message } : {}),
          };
        }

        // If service returned a plain object with an embedded `message`
        // hoist it to the top-level envelope and strip from data
        if (
          resData &&
          typeof resData === 'object' &&
          'message' in resData
        ) {
          const { message, ...rest } = resData as Record<string, unknown>;
          return {
            statusCode: response?.statusCode ?? HttpStatus.OK,
            message: message as string,
            data: rest as T,
            meta: {
              timestamp: new Date().toISOString(),
              path: request?.url ?? '',
            },
          };
        }

        // Default wrap
        return {
          statusCode: response?.statusCode ?? HttpStatus.OK,
          data: resData,
          meta: {
            timestamp: new Date().toISOString(),
            path: request?.url ?? '',
          },
        };
      }),
    );
  }
}
