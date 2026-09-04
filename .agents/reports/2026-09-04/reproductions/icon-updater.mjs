/**
 * Demonstrates the game-icon state-updater defect shared by cfc076e4 / db65fcfa.
 * Branch location: frontend/src/common/Icon.tsx:302,307.
 * Uses the installed project packages; no browser, network, or credentials.
 * Current main's preserved Icon implementation is not implicated by this test.
 */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire('/Users/quzzar/Projects/wanderers-guide/frontend/package.json');
const React = require('react');
const { renderToString } = require('react-dom/server');
const { GiSwapBag } = require('react-icons/gi');

// Render-phase updates let the server renderer exercise the same React updater
// semantics as the branch's effect without requiring a DOM or browser.
function BranchUpdater() {
  const [gameIcon, setGameIcon] = React.useState(null);
  if (!gameIcon) setGameIcon(GiSwapBag);
  return gameIcon ? React.createElement(gameIcon) : null;
}

let observedError;
try {
  renderToString(React.createElement(BranchUpdater));
} catch (error) {
  observedError = error;
}
assert.match(observedError?.message ?? '', /Element type is invalid.*got: object/s);
console.log('PASS: branch updater reproduces invalid-element crash.');
console.log(observedError.message);

function WrappedUpdater() {
  const [gameIcon, setGameIcon] = React.useState(null);
  if (!gameIcon) setGameIcon(() => GiSwapBag);
  return gameIcon ? React.createElement(gameIcon) : null;
}
assert.ok(renderToString(React.createElement(WrappedUpdater)).startsWith('<svg'));
console.log('PASS: wrapping the component value renders SVG.');
console.log('Scope: accepting the perf branches\' Icon implementation remains a blocker; preserving current main avoids it.');
