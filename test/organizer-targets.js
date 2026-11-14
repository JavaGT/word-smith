'use strict';
const assert = require('assert');
const Module = require('module');
const esbuild = require('esbuild');

// Exercise the actual Organizer readings with the Obsidian runtime stubbed.
const result = esbuild.buildSync({ entryPoints: ['src/organizer/organizer-readings.ts'], bundle: true, platform: 'node', format: 'cjs', external: ['obsidian'], write: false });
const load = Module._load;
Module._load = function (name) {
	if (name === 'obsidian') return { TFile: class {} };
	return load.apply(this, arguments);
};
const compiled = new Module('organizer-readings-test', module);
compiled._compile(result.outputFiles[0].text, 'organizer-readings-test.js');
const targets = { 'a.md': 100, 'sub/b.md': 200, 'sub/c.md': 0 };
const plugin = {
	_orgIndex: new Map([['a.md', { words: 40 }], ['sub/b.md', { words: 70 }], ['sub/c.md', { words: 10 }]]),
	settings: { orgFolderTargetSum: true },
	folderTargetFor: () => 999,
	orgTargetSay: (words, target) => `${words}/${target}`
};
const readings = compiled.exports.wsOrgReadingsMake({ plugin, targetOf: (path) => targets[path] || 0 });
const aggregate = (paths, folder) => readings.orgColAgg({ id: 'goal' }, paths, folder);
assert.deepStrictEqual(aggregate(['a.md', 'sub/b.md', 'sub/c.md'], '').goal, { words: 120, target: 300 });
assert.deepStrictEqual(aggregate(['sub/b.md', 'sub/c.md'], 'sub').goal, { words: 80, target: 200 });
assert.strictEqual(aggregate(['sub/c.md'], 'sub'), null);
plugin.settings.orgFolderTargetSum = false;
assert.strictEqual(aggregate(['a.md', 'sub/b.md'], '').goal.target, 999);
plugin.settings.orgFolderTargetSum = true;
targets['sub/b.md'] = 350;
assert.strictEqual(aggregate(['a.md', 'sub/b.md'], '').goal.target, 450);
console.log('Organizer target aggregation passed');
