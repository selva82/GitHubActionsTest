import { readFile, writeFile } from 'node:fs/promises';
import { parse, stringify } from 'yaml';
import { processOpenApi } from './openapi-processor.js';
const [inputPath, outputPath = 'openapi.processed.yml'] = process.argv.slice(2);
if (!inputPath) {
    console.error('Usage: npm run process -- <openapi.yml> [processed-openapi.yml]');
    process.exitCode = 2;
}
else {
    try {
        const input = parse(await readFile(inputPath, 'utf8'));
        await writeFile(outputPath, stringify(processOpenApi(input)), 'utf8');
    }
    catch (error) {
        console.error(error instanceof Error ? error.message : 'Unable to process OpenAPI document');
        process.exitCode = 1;
    }
}
