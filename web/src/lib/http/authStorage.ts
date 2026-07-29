const ACCESS = "harmonia_access";

export const authStorage = {
  get: () => localStorage.getItem(ACCESS),
  set: (a: string) => localStorage.setItem(ACCESS, a),
  clear: () => localStorage.removeItem(ACCESS),
};
