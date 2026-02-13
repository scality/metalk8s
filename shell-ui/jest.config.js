module.exports = {
	transformIgnorePatterns: [
		"/node_modules/(?!vega-lite|@scality|pretty-bytes|uuid|@fortawesome)",
	],
	setupFilesAfterEnv: ["./src/setupTests.ts"],
	clearMocks: true,
	moduleNameMapper: {
		"\\.(css|less)$": "identity-obj-proxy",
		"^@fortawesome/free-solid-svg-icons/(.*)\\.js$": "@fortawesome/free-solid-svg-icons/$1",
		"^@fortawesome/free-regular-svg-icons/(.*)\\.js$": "@fortawesome/free-regular-svg-icons/$1",
	},
	testEnvironment: "jsdom",
};
