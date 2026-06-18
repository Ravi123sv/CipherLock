import { createContext, useContext, useState, type ReactNode } from "react";

type ConnectionStatus = "offline" | "waiting" | "connected";

interface ConnectionState {
  roomCode: string | null;
  status: ConnectionStatus;
  setRoomCode: (code: string | null) => void;
  setStatus: (status: ConnectionStatus) => void;
}

const ConnectionContext = createContext<ConnectionState>({
  roomCode: null,
  status: "offline",
  setRoomCode: () => {},
  setStatus: () => {},
});

export function ConnectionProvider({ children }: { children: ReactNode }) {
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>("offline");

  return (
    <ConnectionContext.Provider value={{ roomCode, status, setRoomCode, setStatus }}>
      {children}
    </ConnectionContext.Provider>
  );
}

export function useConnection() {
  return useContext(ConnectionContext);
}
