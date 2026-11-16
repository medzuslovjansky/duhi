import { unified } from 'unified';
import retextEnglish from 'retext-english';
import retextSyntaxUrls from 'retext-syntax-urls';
import retextStringify from 'retext-stringify';
import type { Node, Parent } from 'unist';
import type { Source } from 'nlcst';
import { hasLatinOrBalancedNonLatinScript } from './detect-script.ts';
import { transliterate } from './transliterate.ts';

function isSourceNode(node: Node): node is Source {
  return node.type === 'SourceNode';
}

function isParent(node: Node): node is Parent {
  return Array.isArray((node as Parent).children);
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

const urlFinder = unified()
  .use(retextEnglish) // Parse text into a syntax tree
  .use(retextSyntaxUrls); // Classify URLs as syntax to preserve them

/** Where the URLs are in the text, as [start, end) offsets. */
function urlRanges(node: Node, ranges: Array<[number, number]> = []): Array<[number, number]> {
  if (isSourceNode(node) && node.position) {
    ranges.push([node.position.start.offset!, node.position.end.offset!]);
  } else if (isParent(node)) {
    node.children.forEach((child) => urlRanges(child, ranges));
  }

  return ranges;
}

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

  // Latin words stay as they are (the engine would respell "world" as "vorld");
  // the rest goes to the engine in runs, because punctuation needs its neighbours:
  // in Glagolitic, `;` after a word is the question mark
  const convert = (part: string) =>
    part
      .split(/(\p{Script=Latin}+)/u)
      .map((run, i) => (i % 2 ? run : transliterate(run)))
      .join('');

  const tree = await urlFinder.run(urlFinder.parse(text));
  let result = '';
  let from = 0;
  for (const [start, end] of urlRanges(tree)) {
    result += convert(text.slice(from, start)) + text.slice(start, end);
    from = end;
  }

  return result + convert(text.slice(from));
}
