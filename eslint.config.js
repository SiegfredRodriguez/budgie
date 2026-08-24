import js from "@eslint/js";
import svelte from "eslint-plugin-svelte";
import globals from "globals";
import ts from "typescript-eslint";
import prettier from "eslint-config-prettier";

export default ts.config(
	js.configs.recommended,
	...ts.configs.recommended,
	...svelte.configs["flat/recommended"],
	prettier,
	...svelte.configs["flat/prettier"],
	{
		languageOptions: {
			globals: { ...globals.browser, ...globals.node },
		},
	},
	{
		files: ["**/*.svelte", "**/*.svelte.ts"],
		languageOptions: {
			parserOptions: {
				parser: ts.parser,
				extraFileExtensions: [".svelte"],
			},
		},
	},
	{
		rules: {
			// Store `mapRow(r: any)` helpers predate typed rows; the remaining
			// spots are tracked, not silently allowed.
			"@typescript-eslint/no-explicit-any": "warn",
		},
	},
	{
		ignores: [
			"build/",
			".svelte-kit/",
			"dist/",
			"dev-dist/",
			"playwright-report/",
			"test-results/",
			"supabase/functions/**",
		],
	},
);
