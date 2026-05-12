import Redis from "ioredis"
//hey
const redis = new Redis({
    host: process.env.REDIS_HOST || "localhost",
    port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT) : 6378
})

// Validate Redis connection
redis.on('error', (err) => {
    console.error('Redis connection error:', err);
});

redis.on('connect', () => {
    console.log('Redis connected successfully');
});

interface RateLimitOptions {
    windowSeconds: number;  // time window
    maxRequests: number;    // max requests in that window
    keyPrefix: string;      // to identify which route
}


export const ratelimiter = (RateLimitOptions: any) => {
    return async (req: any, res: any, next: any) => {
        // identify who is making the request
        // use userId if logged in, otherwise use IP (handle proxies correctly)

        const userId = req.user?.id;
        const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip;
        const identifier = userId || clientIp
        const key = `${RateLimitOptions.keyPrefix}:${identifier}`;

        try {
            // get current count for this key
            const current = await redis.get(key)
            const count = current ? parseInt(current) : 0


            if (count >= RateLimitOptions.maxRequests) {
                //too many request
                return res.status(429).json({
                    message: "Too many requests, slow down",
                    retryAfter: RateLimitOptions.windowSeconds,
                });
            }
            if (count === 0) {
                // first request → set key with expiry
                await redis.setex(key, RateLimitOptions.windowSeconds, 1);
            }
            else {
                // increment existing key
                await redis.incr(key);
            }
            // add headers so client knows their limit
            res.setHeader("X-RateLimit-Limit", RateLimitOptions.maxRequests);
            res.setHeader("X-RateLimit-Remaining", Math.max(0, RateLimitOptions.maxRequests - count - 1));

            next()
        }
        catch (error) {
            // if redis is down, dont block requests
            console.error("Redis error:", error);
            next();
        }
    };
}