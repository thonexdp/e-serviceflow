export function formatDate(dateString) {
  if (!dateString) return "N/A";

  const date = new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });


  const parts = date.split(" ");


  parts[0] = parts[0] + ".";

  return parts.join(" ");
}