const fs = require('fs');
const path = require('path');
// const spawn = require('child_process').spawn;


const distFolder = path.join(__dirname, '/dist');
if (!fs.existsSync(distFolder)) {
	fs.mkdirSync(distFolder);
}

const workersFolder = path.join(__dirname, '/dist/workers');
if (!fs.existsSync(workersFolder)) {
	fs.mkdirSync(workersFolder);
}

module.exports = function (grunt) {
	const dataTypesFolder = 'src/plugins/dataTypes';
	const exportTypesFolder = 'src/plugins/exportTypes';
	const countriesFolder = 'src/plugins/countries';
	const locales = ['de', 'en', 'es', 'fr', 'ja', 'nl', 'ta', 'zh'];

	const generateI18nBundles = () => {
		locales.forEach((locale) => {
			const coreLocaleStrings = JSON.parse(fs.readFileSync(`src/i18n/${locale}.json`, 'utf8'));
			const dtImports = getPluginLocaleFiles(grunt, locale, dataTypesFolder);
			const etImports = getPluginLocaleFiles(grunt, locale, exportTypesFolder);
			const countryImports = getPluginLocaleFiles(grunt, locale, countriesFolder);

			generateLocaleFileTemplate(locale, coreLocaleStrings, dtImports, etImports, countryImports);
		});
	};

	const getPluginLocaleFiles = (grunt, locale, pluginTypeFolder) => {
		const plugins = fs.readdirSync(pluginTypeFolder);
		const imports = {};
		plugins.forEach((folder) => {
			const localeFile = `${pluginTypeFolder}/${folder}/i18n/${locale}.json`;
			if (fs.existsSync(localeFile)) {
				try {
					imports[folder] = JSON.parse(fs.readFileSync(localeFile, 'utf8'));
				} catch (e) {
					grunt.fail.fatal('problem parsing i18n file: ' + localeFile);
				}
			}
		});
		return imports;
	};

	const generateLocaleFileTemplate = (locale, coreLocaleStrings, dtImports, etImports, countryImports) => {
		const template = `// DO NOT EDIT. This file is generated by a Grunt task.
// ----------------------------------------------------

(function() { 
const i18n = {
	core: ${JSON.stringify(coreLocaleStrings)},
	dataTypes: ${JSON.stringify(dtImports)},
	exportTypes: ${JSON.stringify(etImports)},
	countries: ${JSON.stringify(countryImports)}
};

// load the locale info via an exposed global
window.gd.localeLoaded(i18n);
})();`;

		fs.writeFileSync(`./dist/${locale}.js`, template);
	};

	// looks through the plugins and finds the plugins that have a generator web worker file
	const dataTypeWebWorkerMap = (() => {
		const baseFolder = path.join(__dirname, `/src/plugins/dataTypes`);
		const folders = fs.readdirSync(baseFolder);

		const map = {};
		folders.forEach((folder) => {
			const webworkerFile = path.join(__dirname, `/src/plugins/dataTypes/${folder}/${folder}.generator.ts`);
			if (!fs.existsSync(webworkerFile)) {
				return;
			}
			map[`dist/workers/${folder}.generator.js`] = [`src/plugins/dataTypes/${folder}/${folder}.generator.ts`];
		});

		return map;
	})();

	const exportTypeWebWorkerMap = (() => {
		const baseFolder = path.join(__dirname, `/src/plugins/exportTypes`);
		const folders = fs.readdirSync(baseFolder);

		const map = {};
		folders.forEach((folder) => {
			const webworkerFile = path.join(__dirname, `/src/plugins/exportTypes/${folder}/${folder}.generator.ts`);
			if (!fs.existsSync(webworkerFile)) {
				return;
			}
			map[`dist/workers/${folder}.generator.js`] = [`src/plugins/exportTypes/${folder}/${folder}.generator.ts`];
		});

		return map;
	})();

	// returns an object where the keys + values are the same. Takes the keys out of the object passed
	const getIdentifyMap = (obj) => {
		const keys = Object.keys(obj);
		const map = {};
		keys.forEach((key) => {
			map[key] = key;
		});
		return map;
	};

	const generateWorkerMapFile = () => {
		fs.writeFileSync(`./src/_pluginWebWorkers.ts`, `export default ${JSON.stringify(webWorkerMap, null, '\t')};`);
	};

	const getWebWorkerRollupCommands = () => {
		const files = [
			'src/core/generator/dataTypes.worker.ts',
			'src/utils/webWorkerUtils.ts'
		]
			.concat(Object.values(dataTypeWebWorkerMap))
			.concat(Object.values(exportTypeWebWorkerMap));

		const commands = files.map((file) => `npx rollup -c --config-src=${file}`);
		return commands.join(' && ');
	};

	const webWorkerMap = {
		coreWorker: '',
		coreDataTypeWorker: '',
		coreExportTypeWorker: '',
		dataTypes: {},
		exportTypes: {}
	};

	grunt.initConfig({
		cssmin: {
			options: {
				mergeIntoShorthands: false,
				roundingPrecision: -1
			},
			target: {
				files: {
					'dist/styles.css': [
						'src/resources/codemirror.css',
						'src/resources/ambience.css',
						'src/resources/cobalt.css',
						'src/resources/darcula.css',
						'src/resources/lucario.css'
					]
				}
			}
		},

		copy: {
			main: {
				files: [
					{
						expand: true,
						cwd: 'src/images',
						src: ['*'],
						dest: 'dist/images/'
					}
				]
			}
		},

		clean: {
			dist: ['dist']
		},

		shell: {
			webpackProd: {
				command: 'yarn prod'
			},
			webWorkers: {
				command: getWebWorkerRollupCommands()
			},
		},

		// expand to include plugin files too
		watch: {
			webWorkers: {
				files: [
					'src/core/generator/dataTypes.worker.ts'
				],
				tasks: ['webWorkers'],
			}
		},

		md5: {
			coreWebWorker: {
				files: {
					'dist/workers/dataTypes.worker.js': 'dist/workers/dataTypes.worker.js'
				},
				options: {
					after: (fileChanges) => {
						webWorkerMap.coreWorker = path.basename(fileChanges[0].newPath);
					}
				}
			},
			coreUtils: {
				files: {
					'dist/workers/webWorkerUtils.js': 'dist/workers/webWorkerUtils.js'
				},
				options: {
					after: (fileChanges) => {
						webWorkerMap.utils = path.basename(fileChanges[0].newPath);
					}
				}
			},
			dataTypeWebWorkers: {
				files: getIdentifyMap(dataTypeWebWorkerMap),
				options: {
					after: (fileChanges) => {
						const map = {};
						fileChanges.forEach((row) => {
							const filename = path.basename(row.newPath);
							const [dataTypeFolder] = filename.split('.');
							map[dataTypeFolder] = path.basename(row.newPath);
						});
						webWorkerMap.dataTypes = map;
					}
				}
			},
			exportTypeWebWorkers: {
				files: getIdentifyMap(exportTypeWebWorkerMap),
				options: {
					after: (fileChanges) => {
						const map = {};
						fileChanges.forEach((row) => {
							const filename = path.basename(row.newPath);
							const [exportTypeFolder] = filename.split('.');
							map[exportTypeFolder] = path.basename(row.newPath);
						});
						webWorkerMap.exportTypes = map;
					}
				}
			}
		}
	});

	grunt.loadNpmTasks('grunt-contrib-cssmin');
	grunt.loadNpmTasks('grunt-contrib-copy');
	grunt.loadNpmTasks('grunt-contrib-clean');
	grunt.loadNpmTasks('grunt-shell');
	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-contrib-watch');
	grunt.loadNpmTasks('grunt-md5');

	grunt.registerTask('default', ['cssmin', 'copy', 'i18n', 'webWorkers']);
	grunt.registerTask('build', ['default']);
	grunt.registerTask('dev', ['cssmin', 'copy', 'i18n', 'webWorkers', 'watch:webWorkers']);
	grunt.registerTask('prod', ['clean:dist', 'build', 'shell:webpackProd']);
	grunt.registerTask('generateWorkerMapFile', generateWorkerMapFile);
	grunt.registerTask('i18n', generateI18nBundles);

	grunt.registerTask('webWorkers', [
		'shell:webWorkers',
		'md5:dataTypeWebWorkers',
		'md5:exportTypeWebWorkers',
		'md5:coreWebWorker',
		'md5:coreUtils',
		'generateWorkerMapFile'
	]);
};
