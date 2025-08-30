import { io } from "socket.io-client";

const socketUrl =
    import.meta.env.VITE_SOCKET_URL ??
    (typeof window !== "undefined"
        ? `${window.location.protocol}//${window.location.hostname}:4000`
        : undefined);

export const socket = io(socketUrl, {
    withCredentials: true,
});

