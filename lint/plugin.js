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

export default {
  meta: { name: 'app' },
  rules: { 'no-inline-style': noInlineStyle },
};
