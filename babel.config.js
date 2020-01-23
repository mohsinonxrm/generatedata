const presets = [
	{
		presets: [
			[
				"@babel/preset-env",
				{
					"targets": {
						"esmodules": true
					}
				}
			],
			[
				"@babel/preset-react", {}
			]
		]
	}
];

module.exports = { presets };
