#! /usr/bin/env node

const fs = require('fs');
const path = require('path');
const YAML = require('js-yaml');

function main() {
    if (process.argv.length < 3) {
    	throw new Error("Must specify an entrypoint yaml file");
	} else {
    	const entrypoint = path.resolve(process.cwd(), process.argv[2]);
		const resolved = findRef(YAML.load(fs.readFileSync(entrypoint).toString()), path.parse(entrypoint));
		const results = YAML.dump(resolved);

		if (process.argv.length > 3) {
			fs.writeFileSync(process.argv[3], results);
		} else {
			console.log(results);
		}
	}
}

/**
 * 1. Check object for $ref or $refs key.
 * 2. Resolve value of referenced file
 * 3. Recursively check resolved value
 */
function findRef(obj, refPath) {
	for (const pair of Object.entries(obj)) {
		const key = pair[0];
		const value = pair[1];

		// Single file reference. Resolve reference and call findRef on resolved object
		if (key === "$ref" && !value.startsWith("#")) {
			const filePath = path.resolve(refPath.dir, value);
			return findRef(getRef(filePath), path.parse(filePath));

		// Multi file reference. This appends all referenced object values together
		} else if (key === "$refs" && Array.isArray(value)) {
			return value.reduce((acc, ref) => {
				const filePath = path.resolve(refPath.dir, ref);
				const resolved = findRef(getRef(filePath), path.parse(filePath));
				const refPairArr = Object.entries(resolved);
				refPairArr.forEach((refPair) => acc[refPair[0]] = refPair[1]);
				return acc;
			}, {});

		// Check object for references ($ref or $refs)
		} else if (typeof value === "object" && !Array.isArray(value)) {
			obj[key] = findRef(value, refPath);
		}
	}

	return obj;
}

/**
 * Parse reference yaml file to JS object
 */
function getRef(ref) {
	const yamlRef = YAML.load(fs.readFileSync(ref));

	if (!yamlRef) {
	    throw new Error(`${ref} resolved to an invalid value: ${yamlRef}`);
	}

	return yamlRef;
}

main();
