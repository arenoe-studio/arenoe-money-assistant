
declare module 'telegraf-ratelimit' {
  import { Middleware } from 'telegraf';
  
  interface RateLimitOptions {
    window: number;
    limit: number;
    onLimitExceeded?: (ctx: any, next: () => Promise<void>) => void;
    [key: string]: any;
  }
  
  function rateLimit(options: RateLimitOptions): Middleware<any>;
  
  export = rateLimit;
}
