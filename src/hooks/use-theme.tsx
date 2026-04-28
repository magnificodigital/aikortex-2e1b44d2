import { createContext, useContext, useEffect, useState, ReactNode } from "react";

type Theme = "light" | "dark";

const ThemeContext = createContext<{ theme: Theme; toggle: () => void }>({
  theme: "dark",
  toggle: () => {},
});

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem("theme") as Theme;
    return stored === "light" ? "light" : "dark";
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("theme", theme);

    // Apply saved brand colors
    try {
      const brand = localStorage.getItem("aihub_brand");
      if (brand) {
        const { colors } = JSON.parse(brand);
        if (colors) {
          const hexToHsl = (hex: string): string => {
            const r = parseInt(hex.slice(1, 3), 16) / 255;
            const g = parseInt(hex.slice(3, 5), 16) / 255;
            const b = parseInt(hex.slice(5, 7), 16) / 255;
            const max = Math.max(r, g, b), min = Math.min(r, g, b);
            let h = 0, s = 0;
            const l = (max + min) / 2;
            if (max !== min) {
              const d = max - min;
              s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
              switch (max) {
                case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
                case g: h = ((b - r) / d + 2) / 6; break;
                case b: h = ((r - g) / d + 4) / 6; break;
              }
            }
            return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
          };
          const root = document.documentElement;
          if (colors.primary) root.style.setProperty("--primary", hexToHsl(colors.primary));
          if (colors.accent) root.style.setProperty("--accent", hexToHsl(colors.accent));
          if (colors.secondary) root.style.setProperty("--secondary", hexToHsl(colors.secondary));
          if (colors.success) root.style.setProperty("--success", hexToHsl(colors.success));
          if (colors.warning) root.style.setProperty("--warning", hexToHsl(colors.warning));
        }
      }
    } catch {}
  }, [theme]);

  const toggle = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
