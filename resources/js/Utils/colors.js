/**
 * Color helper to get human readable names from hex codes
 */
export const getColorName = (hex) => {
    if (!hex) return "";

    // Remove # if present
    const cleanHex = hex.replace("#", "").toLowerCase();

    // Basic common color mapping
    const colorMap = {
        ffffff: "White",
        "000000": "Black",
        ff0000: "Red",
        "00ff00": "Green",
        "0000ff": "Blue",
        ffff00: "Yellow",
        ff00ff: "Magenta",
        "00ffff": "Cyan",
        808080: "Gray",
        c0c0c0: "Silver",
        800000: "Maroon",
        808000: "Olive",
        "008000": "Dark Green",
        800080: "Purple",
        "008080": "Teal",
        "000080": "Navy",
        ffa500: "Orange",
        ffc0cb: "Pink",
        a52a2a: "Brown",
        f2f2f2: "Light Gray",
        e5e7eb: "Platinum",
        "33ccff": "Sky Blue",
    };

    if (colorMap[cleanHex]) return colorMap[cleanHex];

    // Fallback: Use HSL to describe the color
    try {
        const r = parseInt(cleanHex.substring(0, 2), 16);
        const g = parseInt(cleanHex.substring(2, 4), 16);
        const b = parseInt(cleanHex.substring(4, 6), 16);

        const r_norm = r / 255;
        const g_norm = g / 255;
        const b_norm = b / 255;
        const max = Math.max(r_norm, g_norm, b_norm);
        const min = Math.min(r_norm, g_norm, b_norm);
        let h,
            s,
            l = (max + min) / 2;

        if (max === min) {
            h = s = 0;
        } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r_norm:
                    h = (g_norm - b_norm) / d + (g_norm < b_norm ? 6 : 0);
                    break;
                case g_norm:
                    h = (b_norm - r_norm) / d + 2;
                    break;
                case b_norm:
                    h = (r_norm - g_norm) / d + 4;
                    break;
            }
            h /= 6;
        }

        const hue = h * 360;
        const sat = s * 100;
        const light = l * 100;

        let name = "";
        if (light < 12) return "Deep Black";
        if (light > 92) return "Near White";
        if (sat < 10) {
            if (light < 30) return "Dark Gray";
            if (light < 70) return "Gray";
            return "Light Gray";
        }

        if (light < 30) name += "Dark ";
        else if (light > 75) name += "Light ";

        if (hue < 15) name += "Red";
        else if (hue < 45) name += "Orange";
        else if (hue < 75) name += "Yellow";
        else if (hue < 155) name += "Green";
        else if (hue < 205) name += "Cyan";
        else if (hue < 275) name += "Blue";
        else if (hue < 325) name += "Purple";
        else name += "Red";

        return name;
    } catch (e) {
        return hex;
    }
};

/**
 * Gets the full color display name: Name (Code)
 * @param {string} hex
 * @param {object} jobType
 * @returns {string}
 */
export const getFullColorName = (hex, jobType) => {
    if (!hex) return "";
    const name = getColorName(hex);

    if (
        jobType &&
        jobType.available_colors &&
        Array.isArray(jobType.available_colors)
    ) {
        const found = jobType.available_colors.find((c) =>
            typeof c === "string" ? c === hex : c.hex === hex
        );
        if (found && typeof found === "object" && found.code) {
            return `${name} (${found.code})`;
        }
    }

    return name;
};
