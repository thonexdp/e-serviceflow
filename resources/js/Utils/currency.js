export function formatPeso(value, options = {}) {
  if (value === null || value === undefined || value === "") return "₱0.00";

  const number = Number(value);
  if (isNaN(number)) return "₱0.00";

  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: options.decimals ?? 2
  }).format(number);
}