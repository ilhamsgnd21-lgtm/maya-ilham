export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export const formatNumber = (value: string): string => {
  const numericValue = value.replace(/\D/g, "");
  if (!numericValue) return "";
  
  return new Intl.NumberFormat("id-ID").format(Number(numericValue));
};

export const parseFormattedNumber = (value: string): number => {
  const numericValue = value.replace(/\D/g, "");
  return Number(numericValue) || 0;
};
