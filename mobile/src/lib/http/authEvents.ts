type Listener = () => void;
const listeners = new Set<Listener>();

export const authEvents = {
  onLogout(l: Listener) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  emitLogout() {
    listeners.forEach((l) => l());
  },
};
