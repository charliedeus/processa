import { FlatCompat } from "@eslint/eslintrc";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Converte configs do formato antigo (.eslintrc) para Flat Config
const compat = new FlatCompat({
  baseDirectory: __dirname,
  resolvePluginsRelativeTo: __dirname, // garante resolução correta de plugins
});

const eslintConfig = [
  // Rocketseat + Next Core Web Vitals + Prettier
  ...compat.extends(
    "@rocketseat/eslint-config/next",
    "next/core-web-vitals",
    "prettier"
  ),

  // Regras adicionais personalizadas (opcional)
  {
    rules: {
      // exemplo: forçar uso de ponto e vírgula
      semi: ["error", "never"],
      // exemplo: preferir aspas simples
      quotes: ["error", "single"],
    },
  },
];

export default eslintConfig;
