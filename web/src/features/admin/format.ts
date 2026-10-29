export const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export const formatDate = (isoDate: string) => isoDate.split("-").reverse().join("/");

export const matches = (text: string, query: string) =>
  text.toLocaleLowerCase("pt-BR").includes(query.trim().toLocaleLowerCase("pt-BR"));
