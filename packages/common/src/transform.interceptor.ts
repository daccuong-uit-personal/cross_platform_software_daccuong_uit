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
        // If already fully wrapped (e.g., from proxy forward or service with {statusCode, data, meta})
        if (
          resData &&
          typeof resData === 'object' &&
          'statusCode' in resData &&
          'data' in resData &&
          'meta' in resData
        ) {
          // Ensure data.data is not an object serialized from array
          // If data is a plain object with numeric keys, it's likely a serialized array
          if (Array.isArray(resData.data)) {
            return resData as SuccessResponse<T>;
          }
          
          // Check if this looks like a serialized array (object with numeric string keys)
          if (
            resData.data &&
            typeof resData.data === 'object' &&
            !Array.isArray(resData.data) &&
            Object.keys(resData.data).every((key) => /^\d+$/.test(key))
          ) {
            // Convert back to array
            return {
              statusCode: resData.statusCode,
              data: Object.values(resData.data) as T,
              meta: {
                ...resData.meta,
                timestamp: resData.meta?.timestamp || new Date().toISOString(),
                path: resData.meta?.path || '',
              },
              ...(resData.message ? { message: resData.message } : {}),
            };
          }
          
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
            statusCode: 200,
            data: resData.data,
            meta: {
              ...resData.meta,
              timestamp: new Date().toISOString(),
              path: '',
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
            statusCode: 200,
            message: message as string,
            data: rest as T,
            meta: {
              timestamp: new Date().toISOString(),
              path: '',
            },
          };
        }

        // Default wrap
        return {
          statusCode: 200,
          data: resData,
          meta: {
            timestamp: new Date().toISOString(),
            path: '',
          },
        };
      }),
    );
  }
}
