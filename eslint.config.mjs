import eslint from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier/flat';
import perfectionist from 'eslint-plugin-perfectionist';
import security from 'eslint-plugin-security';
import sonarjs from 'eslint-plugin-sonarjs';
import unicorn from 'eslint-plugin-unicorn';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig([
    eslint.configs.recommended,
    eslintConfigPrettier,
    perfectionist.configs['recommended-natural'],
    sonarjs.configs.recommended,
    unicorn.configs.recommended,
    security.configs.recommended,
    tseslint.configs.strictTypeChecked,
    tseslint.configs.stylisticTypeChecked,
    {
        files: ['**/*.js', '**/*.ts'],
        ignores: ['node_modules/', 'dist/', 'build/'],
        languageOptions: {
            ecmaVersion: 'latest',
            parserOptions: {
                projectService: {
                    allowDefaultProject: ['*.js', '*.mjs'],
                },
            },
            sourceType: 'module',
        },
        rules: {
            // Require braces around arrow function bodies only when required
            // https://eslint.org/docs/latest/rules/arrow-body-style
            'arrow-body-style': ['error', 'as-needed'],

            // Enforce curly braces for all control statements
            // https://eslint.org/docs/latest/rules/curly
            curly: ['error', 'all'],

            // Enforce dot notation whenever possible
            // https://eslint.org/docs/latest/rules/dot-notation
            'dot-notation': ['error'],

            // Require the use of === and !== except for nulls
            // https://eslint.org/docs/latest/rules/eqeqeq
            eqeqeq: ['error', 'always', { null: 'ignore' }],

            // Enforce the consistent use of either function declarations or expressions
            // https://eslint.org/docs/latest/rules/func-style
            'func-style': ['error', 'expression'],

            // Disallow the use of console
            // https://eslint.org/docs/latest/rules/no-console
            'no-console': 'error',

            // Disallow unnecessary labels
            // https://eslint.org/docs/latest/rules/no-extra-label
            'no-extra-label': 'error',

            // Disallow leading or trailing decimal points in numeric literals
            // https://eslint.org/docs/latest/rules/no-floating-decimal
            'no-floating-decimal': 'error',

            // Disallow shorthand type conversions
            // https://eslint.org/docs/latest/rules/no-implicit-coercion
            'no-implicit-coercion': 'error',

            // Disallow `if` statements as the only statement in `else` blocks
            // https://eslint.org/docs/latest/rules/no-lonely-if
            'no-lonely-if': 'error',

            // Disallow initializing variables to `undefined`
            // https://eslint.org/docs/latest/rules/no-undef-init
            'no-undef-init': 'error',

            // Disallow ternary operators when simpler alternatives exist
            // https://eslint.org/docs/latest/rules/no-unneeded-ternary
            'no-unneeded-ternary': 'error',

            // Disallow unnecessary computed property keys in objects. Allow for classes.
            // https://eslint.org/docs/latest/rules/no-useless-computed-key
            'no-useless-computed-key': 'error',

            // Disallow renaming import, export, and destructured assignments to the same name
            // https://eslint.org/docs/latest/rules/no-useless-rename
            'no-useless-rename': 'error',

            // Require `let` or `const` instead of `var`
            // https://eslint.org/docs/latest/rules/no-var
            'no-var': 'error',

            // Require ECMAScript 6 method and property shorthand syntax for object literals
            // https://eslint.org/docs/latest/rules/object-shorthand
            'object-shorthand': [
                'error',
                'always',
                {
                    avoidExplicitReturnArrows: true,
                },
            ],

            // Enforce variables to be declared separately in functions
            // https://eslint.org/docs/latest/rules/one-var
            'one-var': ['error', 'never'],

            // Require assignment operator shorthand where possible
            // https://eslint.org/docs/latest/rules/operator-assignment
            'operator-assignment': 'error',

            // Require using arrow functions for callbacks
            // https://eslint.org/docs/latest/rules/prefer-arrow-callback
            'prefer-arrow-callback': 'error',

            // Require `const` declarations for variables that are never reassigned after declared
            // https://eslint.org/docs/latest/rules/prefer-const
            'prefer-const': 'error',

            // Require destructuring from objects
            // https://eslint.org/docs/latest/rules/prefer-destructuring
            'prefer-destructuring': [
                'error',
                {
                    array: false,
                    object: true,
                },
            ],

            // Disallow the use of Math.pow in favor of the ** operator
            // https://eslint.org/docs/latest/rules/prefer-exponentiation-operator
            'prefer-exponentiation-operator': 'error',

            // Disallow parseInt() and Number.parseInt() in favor of binary, octal, and hexadecimal literals
            // https://eslint.org/docs/latest/rules/prefer-numeric-literals
            'prefer-numeric-literals': 'error',

            // Disallow use of Object.prototype.hasOwnProperty.call() and prefer use of Object.hasOwn()
            // https://eslint.org/docs/latest/rules/prefer-object-has-own
            'prefer-object-has-own': 'error',

            // Disallow using Object.assign with an object literal as the first argument and prefer the use of object spread instead.
            // https://eslint.org/docs/latest/rules/prefer-object-spread
            'prefer-object-spread': 'error',

            // Require template literals instead of string concatenation
            // https://eslint.org/docs/latest/rules/prefer-template
            'prefer-template': 'error',

            // Require quotes around object literal property names only when needed
            // https://eslint.org/docs/latest/rules/quote-props
            'quote-props': ['error', 'as-needed'],

            // It is needlessly complex to invert the result of a boolean comparison. The opposite comparison should be made instead.
            // https://github.com/SonarSource/eslint-plugin-sonarjs/blob/HEAD/docs/rules/no-inverted-boolean-check.md
            'sonarjs/no-inverted-boolean-check': 'error',

            // Disallow TODO and FIXME comments
            // REASON: We don't want those to fail CI, but warn instead.
            // Every TODO/FIXME should be fixed, but it's not always possible.
            // Every TODO/FIXME should have a ticket assigned to it.
            'sonarjs/todo-tag': 'warn',

            // Enforces the use of already destructured objects and their variables over accessing each property individually. Previous destructurings are easily missed which leads to an inconsistent code style.
            // https://github.com/sindresorhus/eslint-plugin-unicorn/blob/HEAD/docs/rules/consistent-destructuring.md
            'unicorn/consistent-destructuring': 'error',

            // Enforce a case style for filenames.
            // https://github.com/sindresorhus/eslint-plugin-unicorn/blob/main/docs/rules/filename-case.md
            'unicorn/filename-case': ['error', { cases: { kebabCase: true } }],

            // Unused properties, much like unused variables, are often a result of incomplete refactoring and may confuse readers.
            // https://github.com/sindresorhus/eslint-plugin-unicorn/blob/HEAD/docs/rules/no-unused-properties.md
            'unicorn/no-unused-properties': 'error',
        },
        settings: {},
    },
]);
