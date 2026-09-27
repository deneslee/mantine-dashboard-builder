// Project lint rules oxlint has no native equivalent for. Loaded through `jsPlugins` in oxlint.config.ts.

/** Design system rule: no inline style objects outside design-system/. */
const noInlineStyle = {
  meta: {
    type: 'suggestion',
    messages: {
      inlineStyle: 'No inline style objects. Use a CSS module, Mantine style props, or a theme variant.',
    },
  },
  create(context) {
    return {
      JSXAttribute(node) {
        if (
          node.name.type === 'JSXIdentifier' &&
          node.name.name === 'style' &&
          node.value?.type === 'JSXExpressionContainer' &&
          node.value.expression.type === 'ObjectExpression'
        ) {
          context.report({ node, messageId: 'inlineStyle' });
        }
      },
    };
  },
};

const SPACING_PROPS = new Set(
  [
    'm mt mb ml mr ms me mx my',
    'p pt pb pl pr ps pe px py',
    'gap rowGap columnGap spacing verticalSpacing gutter',
  ]
    .join(' ')
    .split(' '),
);
const KEY_PROPS = new Set(['fw', 'fz', 'radius']);
const COLOR_PROPS = new Set(['c', 'color', 'bg']);
const PALETTE = /^(dark|gray|red|pink|grape|violet|indigo|blue|cyan|teal|green|lime|yellow|orange)(\.\d)?$/;
const RAW_COLOR = /^(#|rgba?\(|hsla?\()/;

/** `{4}` → 4; anything else → undefined. */
function numberOf(value) {
  const e = value?.type === 'JSXExpressionContainer' ? value.expression : undefined;
  return e?.type === 'Literal' && typeof e.value === 'number' ? e.value : undefined;
}

/** `"red"` or `{'red'}` → 'red'; anything else → undefined. */
function stringOf(value) {
  const e = value?.type === 'JSXExpressionContainer' ? value.expression : value;
  return e?.type === 'Literal' && typeof e.value === 'string' ? e.value : undefined;
}

/**
 * Design system rule: Mantine props take token keys, not raw values (docs/design-system.md). Numbers in
 * spacing, `fw`, `fz` and `radius`; palette or raw colors in `c`, `color` and `bg`; numeric
 * `size` / `stroke` on Tabler icons.
 */
const noRawStyleProps = {
  meta: {
    type: 'suggestion',
    messages: {
      spacing: 'Use a spacing key (3xs, 2xs, xs, sm, md, lg, xl) for `{{prop}}`, not {{value}}.',
      key: 'Use a token for `{{prop}}` (`fontWeight.*` for fw, a size key for fz, the theme default for radius), not {{value}}.',
      color:
        'Use a semantic color (brand, neutral, danger, warning, success, info, dimmed, bright) for `{{prop}}`, not "{{value}}".',
      icon: 'Use `iconSize` / `iconStroke` from @/design-system/tokens/semantic for `{{prop}}`, not {{value}}.',
    },
  },
  create(context) {
    return {
      JSXOpeningElement(node) {
        const element = node.name.type === 'JSXIdentifier' ? node.name.name : '';
        const isIcon = element.startsWith('Icon');
        for (const attr of node.attributes) {
          if (attr.type !== 'JSXAttribute' || attr.name.type !== 'JSXIdentifier') continue;
          const prop = attr.name.name;
          const num = numberOf(attr.value);
          if (isIcon && (prop === 'size' || prop === 'stroke') && num !== undefined) {
            context.report({ node: attr, messageId: 'icon', data: { prop, value: String(num) } });
          } else if (SPACING_PROPS.has(prop) && num !== undefined && num !== 0) {
            context.report({ node: attr, messageId: 'spacing', data: { prop, value: String(num) } });
          } else if (KEY_PROPS.has(prop) && num !== undefined && num !== 0) {
            context.report({ node: attr, messageId: 'key', data: { prop, value: String(num) } });
          } else if (COLOR_PROPS.has(prop)) {
            const str = stringOf(attr.value);
            if (str !== undefined && (PALETTE.test(str) || RAW_COLOR.test(str))) {
              context.report({ node: attr, messageId: 'color', data: { prop, value: str } });
            }
          }
        }
      },
    };
  },
};

export default {
  meta: { name: 'app' },
  rules: { 'no-inline-style': noInlineStyle, 'no-raw-style-props': noRawStyleProps },
};
