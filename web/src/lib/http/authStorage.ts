const ACCESS = "harmonia_access";
const REFRESH = "harmonia_refresh";

export const authStorage = {
  get: () => ({
    access: localStorage.getItem(ACCESS),
    refresh: localStorage.getItem(REFRESH),
  }),
  set: (a: string, r: string) => {
    localStorage.setItem(ACCESS, a);
    localStorage.setItem(REFRESH, r);
  },
  clear: () => {
    localStorage.removeItem(ACCESS);
    localStorage.removeItem(REFRESH);
  },
};
