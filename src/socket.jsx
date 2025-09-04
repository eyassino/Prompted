import { io } from "socket.io-client";

const val = import.meta.env.VITE_SOCKET_URL;

const socketUrl =
    val ??
    (typeof window !== "undefined"
        ? `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.hostname}`
        : undefined);

export const socket = io(socketUrl, {
    path: "/socket.io/",
    withCredentials: true,
    transports: ["websocket", "polling"]
});