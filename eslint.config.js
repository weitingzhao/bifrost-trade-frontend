import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist', 'src/components/ui/**', 'src/hooks/use-mobile.ts'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      'no-console': 'error',
      // TD-232: `new Date().toISOString().slice(0, 10)` is the UTC date — from
      // 20:00 ET it is already tomorrow. "Today" is etTodayIso() (New York's
      // session day, @/lib/freshness) or chicagoTodayDateStr() (the ledger's
      // Chicago day). A site that is UTC on purpose names it (todayUtc) and
      // disables this line with a reason; src/lib/utcTodayRatchet.test.ts
      // holds the allowlist.
      'no-restricted-syntax': [
        'error',
        ...[
          "CallExpression[callee.property.name=/^(slice|substring|substr)$/][arguments.0.value=0]",
          "CallExpression[callee.property.name='split']",
        ].map((call) => ({
          selector: `${call} > MemberExpression > CallExpression[callee.property.name=/^(toISOString|toJSON)$/] > MemberExpression > NewExpression[callee.name='Date'][arguments.length=0]`,
          message:
            "UTC 'today': from 20:00 ET this is tomorrow. Use etTodayIso() (New York session day, @/lib/freshness) or chicagoTodayDateStr() (ledger day).",
        })),
      ],
    },
  },
  {
    files: [
      '**/socketIngestControls.tsx',
      '**/IngestConnectionCell.tsx',
      '**/daemonShared.tsx',
      '**/TabLamp.tsx',
    ],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
)
