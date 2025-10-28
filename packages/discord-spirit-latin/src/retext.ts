import { unified } from 'unified';
import retextEnglish from 'retext-english';
import retextSyntaxUrls from 'retext-syntax-urls';
import retextStringify from 'retext-stringify';
import type { Node, Parent } from 'unist';
import type { Text, Source } from 'nlcst';
import { hasLatinOrBalancedNonLatinScript } from './detect-script.ts';
import { transliterate } from './transliterate.ts';

function isText(node: Node): node is Text {
  return node.type === 'TextNode';
}

function isSourceNode(node: Node): node is Source {
  return node.type === 'SourceNode';
}

function isParent(node: Node): node is Parent {
  return Array.isArray((node as Parent).children);
}

/**
 * Custom retext plugin that transliterates text nodes with non-balanced Latin script while preserving URLs
 */
function retextTransliterate() {
  function visit(node: Node) {
    if (isText(node)) {
      node.value = transliterate(node.value);
    }

    if (isParent(node)) {
      node.children.forEach(visit);
    }
  }

  return (tree: Node) => visit(tree);
}

function retextRemoveNonTextNodes() {
  function visit(node: Node) {
    if (isSourceNode(node)) {
      node.value = '';
    }

    if (isParent(node)) {
      node.children.forEach(visit);
    }
  }

  return (tree: Node) => visit(tree);
}

const purifier = unified()
  .use(retextEnglish) // Parse text into a syntax tree
  .use(retextSyntaxUrls) // Classify URLs as syntax to preserve them
  .use(retextRemoveNonTextNodes)
  .use(retextStringify); // Convert back to string

const transliterator = unified()
  .use(retextEnglish) // Parse text into a syntax tree
  .use(retextSyntaxUrls) // Classify URLs as syntax to preserve them
  .use(retextTransliterate)
  .use(retextStringify); // Convert back to string

/**
 * Transliterates text with non-balanced Latin script to Latin script while preserving URLs
 * @param text - The input text to transliterate
 * @returns The transliterated text with URLs preserved
 */
export async function transliterateWithUrlPreservation(text: string): Promise<string> {
  const pure = await purifier.process(text);
  if (hasLatinOrBalancedNonLatinScript(String(pure))) {
    return text;
  }

  const result = await transliterator.process(text);
  return String(result);
}
