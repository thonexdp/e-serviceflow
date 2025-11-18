export function formatDate(dateString) {
    if (!dateString) return "N/A";

    const date = new Date(dateString).toLocaleDateString("en-US", {
        month: "short",   // Jan, Feb, Mar
        day: "numeric",   // 1, 2, 12
        year: "numeric",  // 2025
    });

    // date = "Jan 12, 2025"
    const parts = date.split(" "); // ["Jan", "12,", "2025"]

    // Add the period after month
    parts[0] = parts[0] + ".";

    return parts.join(" ");
}
