module.exports = function(grunt) {
	//	Concatenation file order
	var concatFiles = [
		'node_modules/jsondiffpatch/public/build/jsondiffpatch.js',
		'lib/hash.js',
		'lib/sockjs-1.0.3.js',
		'lib/dataportal.js'
	];

	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		//	Create the build
		concat: {
			testbuild: {
				options: {
					separator: ';',
					//  We'd prefer to fail on missing files, but at least this will 
					//	supposedly warn: https://github.com/gruntjs/grunt-contrib-concat/issues/15
					nonull: true
				},
				files: {
					'build/test.dataportal.js': concatFiles
				}
			},
			prodbuild: {
				options: {
					separator: ';'
				},
				files: {
					'build/version/<%= pkg.name %>-<%= pkg.version %>.js': concatFiles,
					'build/<%= pkg.name %>.js': concatFiles
				}
			}
		},
		/* TODO: Find a way to test three.js with phantom or some other way */
		qunit: {
			files: ['test/**/*.htm']
		},
		uglify: {
			options: {
				banner: '/*! <%= pkg.name %> <%= pkg.version %> (built <%= grunt.template.today("dd-mm-yyyy") %>) */\n'
			},
			build: {
				files: {
					'build/version/<%= pkg.name %>-<%= pkg.version %>.min.js': 'build/version/<%= pkg.name %>-<%= pkg.version %>.js',
					'build/<%= pkg.name %>.min.js': 'build/<%= pkg.name %>.js'
				}
			}
		},
		jshint: {
			files: ['Gruntfile.js', 'src/**/*.js', 'test/**/*.js'],
			options: {
				ignores: ['test/libs/*.js', 'test/build/*.js', 'test/build/**/*.js', 'src/pep.js', 'src/img360_header.js', 'src/img360_footer.js'],
				// options here to override JSHint defaults
				globals: {
					jQuery: true,
					console: true,
					module: true,
					document: true
				},
				//	Ignore specific errors
				'-W015': true,	//	Indentation of }
				'-W099': true,	//	Mixed spaces and tabs
				'-W032': true	//	Unnecessary semicolon
			}
		},
		watch: {
			files: ['<%= jshint.files %>'],
			//	Just build when watching
			tasks: ['concat:testbuild', 'concat:prodbuild']
		}
	});

	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-contrib-jshint');
	grunt.loadNpmTasks('grunt-contrib-qunit');
	grunt.loadNpmTasks('grunt-contrib-watch');
	grunt.loadNpmTasks('grunt-contrib-concat');

	//grunt.registerTask('test', ['jshint', 'qunit']);
	grunt.registerTask('test', ['jshint']);
	grunt.registerTask('prodbuild', ['concat:prodbuild']);
	grunt.registerTask('default', ['concat:testbuild', 'jshint', /*'qunit',*/ 'concat:prodbuild', 'uglify']);
};