import { defineConfig, globalIgnores } from "eslint/config";
import typescriptEslint from "@typescript-eslint/eslint-plugin";
import importPlugin from "eslint-plugin-import";
import globals from "globals";
import tsParser from "@typescript-eslint/parser";
import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
});

export default defineConfig([
    {
        ignores: [
            "dist/**",
            "docs/**",
            "node_modules/**",
            "**/*.test.ts",
            "tests/**",
            "temp-dist/**",
            "scripts/**",
            "coverage/**",
            "output/**",
            "src/util/logger.ts" // Logger needs console
        ]
    },
    {
        extends: compat.extends("eslint:recommended", "plugin:@typescript-eslint/recommended"),

        plugins: {
            "@typescript-eslint": typescriptEslint,
            "import": importPlugin,
        },

        languageOptions: {
            globals: {
                ...globals.node,
            },

            parser: tsParser,
            ecmaVersion: "latest",
            sourceType: "module",
        },

        rules: {
            "@typescript-eslint/no-explicit-any": "off",
            "@typescript-eslint/explicit-function-return-type": "off",
            "no-console": "off", // Allow console statements

            "@typescript-eslint/no-unused-vars": ["warn", {
                argsIgnorePattern: "^_",
                varsIgnorePattern: "^_",
            }],

            indent: ["warn", 4, {
                SwitchCase: 1,
            }],

            "import/extensions": "off", // Allow .js extensions for ESM

            "import/no-extraneous-dependencies": ["error", {
                devDependencies: true,
                optionalDependencies: false,
                peerDependencies: false,
            }],

            "no-console": ["error"],

            "no-restricted-imports": ["error", {
                paths: ["dayjs", "fs", "moment-timezone"],
                patterns: [
                    {
                        group: ["src/**"],
                        message: "Use absolute imports instead of relative imports"
                    }
                ]
            }]
        },
    }]);
