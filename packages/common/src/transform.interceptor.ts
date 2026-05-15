import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, { statusCode: number; data: T; meta: { timestamp: string; path: string } }> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<{ statusCode: number; data: T; meta: { timestamp: string; path: string } }> {
    const ctx = context.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    return next.handle().pipe(
      map((data) => ({
        statusCode: response?.statusCode ?? 200,
        data,
        meta: {
          timestamp: new Date().toISOString(),
          path: request?.url ?? '',
        },
      })),
    );
  }
}
