import { transformBlocks, transformToBlockQuote } from './docs.mjs';
import { remark as remarkBuilder } from 'remark'; // import it this way so we can mock it
import { vi, afterEach, describe, it, expect } from 'vitest';

const remark = remarkBuilder();

vi.mock('remark', async (importOriginal) => {
  const { remark: originalRemarkBuilder } = (await importOriginal()) as {
    remark: typeof remarkBuilder;
  };

  // make sure that both `docs.mts` and this test file are using the same remark
  // object so that we can mock it
  const sharedRemark = originalRemarkBuilder();
  return {
    remark: () => sharedRemark,
  };
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('docs.mts', () => {
  describe('transformBlocks', () => {
    it('uses remark.parse to create the AST for the file ', () => {
      const remarkParseSpy = vi
        .spyOn(remark, 'parse')
        .mockReturnValue({ type: 'root', children: [] });
      const contents = 'Markdown file contents';
      transformBlocks(contents);
      expect(remarkParseSpy).toHaveBeenCalledWith(contents);
    });
    describe('checks each AST node', () => {
      it('does no transformation if there are no code blocks', async () => {
        const contents = 'Markdown file contents\n';
        const result = transformBlocks(contents);
        expect(result).toEqual(contents);
      });

      describe('is a code block', () => {
        const beforeCodeLine = 'test\n';
        const diagram_text = 'graph\n A --> B\n';

        describe('language = "mermaid-nocode"', () => {
          const lang_keyword = 'mermaid-nocode';
          const contents = beforeCodeLine + '```' + lang_keyword + '\n' + diagram_text + '\n```\n';

          it('changes the language to "mermaid"', () => {
            const result = transformBlocks(contents);
            expect(result).toEqual(
              beforeCodeLine + '\n' + '```' + 'mermaid' + '\n' + diagram_text + '\n```\n'
            );
          });
        });

        describe('language = "mermaid" | "mmd" | "mermaid-example"', () => {
          const mermaid_keywords = ['mermaid', 'mmd', 'mermaid-example'];

          mermaid_keywords.forEach((lang_keyword) => {
            const contents =
              beforeCodeLine + '```' + lang_keyword + '\n' + diagram_text + '\n```\n';

            it('changes the language to "mermaid-example" and adds a copy of the code block with language = "mermaid"', () => {
              const result = transformBlocks(contents);
              expect(result).toEqual(
                beforeCodeLine +
                  '\n' +
                  '```mermaid-example\n' +
                  diagram_text +
                  '\n```\n' +
                  '\n```mermaid\n' +
                  diagram_text +
                  '\n```\n'
              );
            });
          });
        });

        it('calls transformToBlockQuote with the node information', () => {
          const lang_keyword = 'note';
          const contents =
            beforeCodeLine + '```' + lang_keyword + '\n' + 'This is the text\n' + '```\n';

          const result = transformBlocks(contents);
          expect(result).toEqual(beforeCodeLine + '\n> **Note**\n' + '> This is the text\n');
        });
      });
    });
  });

  describe('transformToBlockQuote', () => {
    // TODO Is there a way to test this with --vitepress given as a process argument?

    describe('vitepress is not given as an argument', () => {
      it('everything starts with "> " (= block quote)', () => {
        const result = transformToBlockQuote('first line\n\n\nfourth line', 'blorfType');
        expect(result).toMatch(/> (.)*\n> first line(?:\n> ){3}fourth line/);
      });

      it('includes an icon if there is one for the type', () => {
        const result = transformToBlockQuote(
          'first line\n\n\nfourth line',
          'danger',
          'Custom Title'
        );
        expect(result).toMatch(/> \*\*‼️ Custom Title\*\* /);
      });

      describe('a custom title is given', () => {
        it('custom title is surrounded in spaces, in bold', () => {
          const result = transformToBlockQuote(
            'first line\n\n\nfourth line',
            'blorfType',
            'Custom Title'
          );
          expect(result).toMatch(/> \*\*Custom Title\*\* /);
        });
      });

      describe.skip('no custom title is given', () => {
        it('title is the icon and the capitalized type, in bold', () => {
          const result = transformToBlockQuote('first line\n\n\nfourth line', 'blorf type');
          expect(result).toMatch(/> \*\*Blorf Type\*\* /);
        });
      });
    });
  });
});
