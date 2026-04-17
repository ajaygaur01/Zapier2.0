"use client";

// apps/frontend/src/hooks/useNotifications.ts
import { useEffect, useRef, useState } from "react";
import { toast } from "react-hot-toast";  // or any toast library

export function useNotifications(userId: string) {
    const ws = useRef<WebSocket | null>(null);
    const [notifications, setNotifications] = useState<any[]>([]);

    useEffect(() => {
        if (!userId || userId === "undefined" || userId === "null") return;

        // connect to notification service
        ws.current = new WebSocket("ws://localhost:9000");

        ws.current.onopen = () => {
            console.log("Connected to notification service");

            // register this user
            ws.current?.send(JSON.stringify({
                type: "register",
                userId: userId
            }));
        };

        ws.current.onmessage = (event) => {
            const notification = JSON.parse(event.data);

            if (notification.type === "registered") return;
            
            setNotifications((prev) => [notification, ...prev]);

            // show toast based on status
            if (notification.status === "success") {
                toast.success(notification.message, {
                    duration: 4000,
                });
            } else {
                toast.error(notification.message, {
                    duration: 4000,
                });
            }
        };

        ws.current.onclose = () => {
            console.log("Disconnected from notification service");
        };

        ws.current.onerror = (error) => {
            console.error("WebSocket error:", error);
        };

        // cleanup on unmount
        return () => {
            ws.current?.close();
        };

    }, [userId]);

    return { notifications };
}