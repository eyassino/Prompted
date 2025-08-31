import { io } from "socket.io-client";

const val = import.meta.env.VITE_SOCKET_URL;

const socketUrl =
    val ??
    (typeof window !== "undefined"
        ? `${window.location.protocol}//${window.location.hostname}:4000`
        : undefined);

export const socket = io(socketUrl, {
    withCredentials: true,
});