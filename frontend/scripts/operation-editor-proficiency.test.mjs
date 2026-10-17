import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

test('proficiency editing accepts prior primitive values without mutating saved inputs', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'wg-prof-editor-'));
  try {
    const frontend = fileURLToPath(new URL('../', import.meta.url));
    const stubs = {
      '../Operations': 'export const OperationWrapper = () => null;',
      '@common/VariableSelect': 'export default function VariableSelect() { return null; }',
      '@variables/variable-manager': 'export const getVariable = () => undefined;',
      '@mantine/hooks': 'export const useDidUpdate = () => {};',
      '@mantine/core':
        'export const Box = () => null, JsonInput = Box, NumberInput = Box, SegmentedControl = Box, TextInput = Box, Text = Box;',
    };
    const bundle = await build({
      absWorkingDir: frontend,
      stdin: {
        contents:
          "export {SetValueInput} from './src/common/operations/variables/SetValOperation'; export {getDefaultSetValue} from './src/common/operations/variables/operation-value-defaults';",
        resolveDir: frontend,
        loader: 'tsx',
      },
      tsconfig: join(frontend, 'tsconfig.json'),
      bundle: true,
      write: false,
      platform: 'node',
      format: 'esm',
      plugins: [
        {
          name: 'editor-boundaries',
          setup(b) {
            b.onResolve({ filter: /.*/ }, ({ path }) => (stubs[path] ? { path, namespace: 'stub' } : undefined));
            b.onLoad({ filter: /.*/, namespace: 'stub' }, ({ path }) => ({ contents: stubs[path] }));
          },
        },
      ],
    });
    const path = join(directory, 'editor.mjs');
    await writeFile(path, bundle.outputFiles[0].text);
    const { SetValueInput, getDefaultSetValue } = await import(pathToFileURL(path));
    const operations = await readFile(join(frontend, 'src/common/operations/Operations.tsx'), 'utf8');
    const typeChange = operations.match(/onTypeChange=\{\(variableType\) => \{([\s\S]*?)\n          \}\}/)?.[1];
    assert.ok(typeChange);
    for (const variableType of ['prof', 'attr', 'num', 'str', 'bool', 'list-str']) {
      const operation = { data: { type: 'str', value: 'old text' } };
      let saved;
      new Function('variableType', 'opCreateValue', 'props', 'cloneDeep', 'getDefaultSetValue', typeChange)(
        variableType,
        operation,
        {
          onChange: (value) => {
            saved = value;
          },
        },
        structuredClone,
        getDefaultSetValue
      );
      assert.equal(saved.data.type, variableType);
      assert.deepEqual(saved.data.value, getDefaultSetValue(variableType));
    }
    for (const input of [
      'old text',
      1,
      true,
      '',
      null,
      Object.freeze({}),
      Object.freeze({ value: 'E', attribute: 'ATTRIBUTE_INT' }),
    ]) {
      const before = structuredClone(input);
      const edits = [];
      const tree = SetValueInput({ variableType: 'prof', value: input, onChange: (value) => edits.push(value) });
      const [rank, attribute] = tree.props.children;
      assert.equal(rank.props.value, input?.value || 'U');
      rank.props.onChange('T');
      assert.equal(edits[0].value, 'T');
      assert.equal(edits[0].attribute, input?.attribute);
      attribute.props.onChange('ATTRIBUTE_INT', { name: 'ATTRIBUTE_INT' });
      assert.equal(edits[1].attribute, 'ATTRIBUTE_INT');
      assert.deepEqual(input, before, 'rendering and editing never mutate input props');
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
