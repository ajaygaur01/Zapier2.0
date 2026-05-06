// CI/CD Test Change
import "dotenv/config"
import { WebSocketServer, WebSocket } from "ws";
import Redis from "ioredis"

const PORT = Number(process.env.PORT) || 9000;
// WebSocket server

const wss  = new WebSocketServer({port : PORT})
// Map of userId → WebSocket connection
// When user opens browser → their socket stored here

const userSockets = new Map<string, WebSocket>();
console.log(`WebSocket server running on port ${PORT}`);

// When browser connects
wss.on("connection" , (ws , req) => {
console.log("New WebSocket connection");
// browser sends userId after connecting

ws.on("message" , (data) => {
    try {
        const message = JSON.parse(data.toString());
        if (message.type === "register") {
            const userId = String(message.userId ?? message.userid ?? message.user ?? "").trim();
            if (!userId || userId === "undefined" || userId === "null") {
                console.warn("Register message missing valid userId, ignoring", message);
                return;
            }

            // store this socket against userId
            userSockets.set(userId, ws);
            console.log(`User ${userId} registered for notifications`);
            ws.send(JSON.stringify({
                type: "registered",
                message: "connected to notification service"
            }));
        }
    } catch (error) {
        console.error("Error parsing message:", error);
    }
})

// when browser disconnects
ws.on("close" , () => {
    //remove from map
    for (const [userId, socket] of userSockets.entries()) {
        if (socket === ws) {
            userSockets.delete(userId);
            console.log(`User ${userId} disconnected`);
            break;
        }
    }
})
})

// Redis subscriber
const subscriber = new Redis({
    host: process.env.REDIS_HOST || "localhost",
    port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT) : 6379
});

// subscribe to the channel worker publishes to
subscriber.subscribe("zap-notification" , (err) => {
    if (err) {
        console.error("Failed to subscribe to Redis:", err);
        return;
    }
    console.log("Subscribed to zap-notifications channel");
})

subscriber.on("message" , (channel:any , message) => {
    try {
        const notification = JSON.parse(message);
        // { userId: "1", zapId: "zap-001", status: "success", message: "..." }
        console.log("Notification received:", notification);
        const userId = String(notification.userId ?? notification.userid ?? notification.user ?? "").trim();
        const userSocket = userId ? userSockets.get(userId) : undefined;
        if (userSocket && userSocket.readyState === WebSocket.OPEN) {
            // send to their browser
            userSocket.send(JSON.stringify(notification));
            console.log(`Notification sent to user ${userId}`);
        } else {
            console.log(`User ${userId || "undefined"} not connected, skipping`);
        }
    } catch (error) {
        console.error("Error processing notification:", error);
    }
})