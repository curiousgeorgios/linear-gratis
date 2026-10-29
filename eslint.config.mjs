import { fixupConfigRules } from "@eslint/compat";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [
  { ignores: [".open-next/**", ".vercel/**", ".wrangler/**"] },
  ...fixupConfigRules([...nextVitals, ...nextTypescript]),
  {
    rules: {
      "@typescript-eslint/no-require-imports": "warn",
      "react-hooks/immutability": "off",
      "react-hooks/set-state-in-effect": "off",
      "react/no-children-prop": "warn",
    },
  },
];

export default eslintConfig;
